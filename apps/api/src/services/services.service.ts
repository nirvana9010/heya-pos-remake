import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { QueryServiceDto } from './dto/query-service.dto';
import { ImportServicesDto, ServiceImportItem } from './dto/import-services.dto';
import { CreateServiceCategoryDto } from './dto/create-category.dto';
import { UpdateServiceCategoryDto } from './dto/update-category.dto';
import { Service, ServiceCategory, Prisma } from '@prisma/client';
import { PaginatedResponse } from '../types';

// Extended Service type with categoryName
type ServiceWithCategoryName = Service & {
  categoryModel?: ServiceCategory | null;
  categoryName?: string | null;
};

@Injectable()
export class ServicesService {
  constructor(private prisma: PrismaService) {}

  // ============= SERVICE CRUD =============

  async create(merchantId: string, dto: CreateServiceDto): Promise<ServiceWithCategoryName> {
    // Check if service with same name already exists
    const existing = await this.prisma.service.findFirst({
      where: {
        merchantId,
        name: dto.name,
      },
    });

    if (existing) {
      throw new ConflictException('Service with this name already exists');
    }

    // If category name is provided instead of ID, find or create category
    let categoryId = dto.categoryId;
    // Handle empty string as null/undefined
    if (!categoryId || categoryId.trim() === '') {
      categoryId = undefined;
      if (dto.category) {
        const category = await this.findOrCreateCategory(merchantId, dto.category);
        categoryId = category.id;
      }
    }

    const service = await this.prisma.service.create({
      data: {
        merchantId,
        name: dto.name,
        description: dto.description,
        categoryId,
        category: dto.category,
        duration: dto.duration,
        price: dto.price,
        currency: dto.currency || 'AUD',
        taxRate: dto.taxRate ?? 0.1, // Default 10% GST
        isActive: dto.isActive ?? true,
        requiresDeposit: dto.requiresDeposit ?? false,
        depositAmount: dto.depositAmount,
        maxAdvanceBooking: dto.maxAdvanceBooking ?? 90,
        minAdvanceBooking: dto.minAdvanceBooking ?? 0,
        displayOrder: dto.displayOrder ?? 0,
      },
      include: {
        categoryModel: true,
      },
    });

    return {
      ...service,
      categoryName: service.categoryModel?.name || service.category || null,
    };
  }

  async findAll(
    merchantId: string,
    query: QueryServiceDto,
  ): Promise<PaginatedResponse<ServiceWithCategoryName>> {
    const {
      categoryId,
      isActive,
      searchTerm,
      minPrice,
      maxPrice,
      minDuration,
      maxDuration,
      page = 1,
      limit = 20,
      sortBy = 'displayOrder',
      sortOrder = 'asc',
    } = query;

    // Build where clause for Prisma query
    const where: Prisma.ServiceWhereInput = {
      merchantId,
      ...(categoryId && { categoryId }),
      ...(isActive !== undefined && { isActive }),
      ...(minPrice !== undefined && { price: { gte: minPrice } }),
      ...(maxPrice !== undefined && { price: { lte: maxPrice } }),
      ...(minDuration !== undefined && { duration: { gte: minDuration } }),
      ...(maxDuration !== undefined && { duration: { lte: maxDuration } }),
    };

    // Add search conditions if provided
    if (searchTerm && searchTerm.trim()) {
      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
        { category: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }


    const [total, services] = await Promise.all([
      this.prisma.service.count({ where }),
      this.prisma.service.findMany({
        where,
        include: {
          categoryModel: true,
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    // Add categoryName to each service
    const servicesWithCategoryName = services.map(service => ({
      ...service,
      categoryName: service.categoryModel?.name || service.category || null,
    }));

    return {
      data: servicesWithCategoryName,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, merchantId: string): Promise<ServiceWithCategoryName> {
    const service = await this.prisma.service.findFirst({
      where: { id, merchantId },
      include: {
        categoryModel: true,
      },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    return {
      ...service,
      categoryName: service.categoryModel?.name || service.category || null,
    };
  }

  async update(
    id: string,
    merchantId: string,
    dto: UpdateServiceDto,
  ): Promise<ServiceWithCategoryName> {
    const service = await this.findOne(id, merchantId);

    // Check if updating name would create duplicate
    if (dto.name && dto.name !== service.name) {
      const existing = await this.prisma.service.findFirst({
        where: {
          merchantId,
          name: dto.name,
          NOT: { id },
        },
      });

      if (existing) {
        throw new ConflictException('Service with this name already exists');
      }
    }

    // Handle category update
    let categoryId = dto.categoryId;
    if (!categoryId && dto.category && dto.category !== service.category) {
      const category = await this.findOrCreateCategory(merchantId, dto.category);
      categoryId = category.id;
    }

    const updatedService = await this.prisma.service.update({
      where: { id },
      data: {
        ...dto,
        categoryId: categoryId !== undefined ? categoryId : service.categoryId,
      },
      include: {
        categoryModel: true,
      },
    });

    return {
      ...updatedService,
      categoryName: updatedService.categoryModel?.name || updatedService.category || null,
    };
  }

  async remove(id: string, merchantId: string): Promise<void> {
    await this.findOne(id, merchantId);

    // Check if service is used in any bookings
    const bookingCount = await this.prisma.bookingService.count({
      where: { serviceId: id },
    });

    if (bookingCount > 0) {
      // Soft delete by deactivating
      await this.prisma.service.update({
        where: { id },
        data: { isActive: false },
      });
    } else {
      // Hard delete if not used
      await this.prisma.service.delete({
        where: { id },
      });
    }
  }

  // ============= CATEGORY MANAGEMENT =============

  async createCategory(
    merchantId: string,
    dto: CreateServiceCategoryDto,
  ): Promise<ServiceCategory> {
    const existing = await this.prisma.serviceCategory.findFirst({
      where: {
        merchantId,
        name: dto.name,
      },
    });

    if (existing) {
      throw new ConflictException('Category with this name already exists');
    }

    return this.prisma.serviceCategory.create({
      data: {
        merchantId,
        name: dto.name,
        description: dto.description,
        icon: dto.icon,
        color: dto.color,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async findAllCategories(merchantId: string): Promise<ServiceCategory[]> {
    return this.prisma.serviceCategory.findMany({
      where: { merchantId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        _count: {
          select: { services: true },
        },
      },
    });
  }

  async updateCategory(
    id: string,
    merchantId: string,
    dto: UpdateServiceCategoryDto,
  ): Promise<ServiceCategory> {
    const category = await this.prisma.serviceCategory.findFirst({
      where: { id, merchantId },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    if (dto.name && dto.name !== category.name) {
      const existing = await this.prisma.serviceCategory.findFirst({
        where: {
          merchantId,
          name: dto.name,
          NOT: { id },
        },
      });

      if (existing) {
        throw new ConflictException('Category with this name already exists');
      }
    }

    return this.prisma.serviceCategory.update({
      where: { id },
      data: dto,
    });
  }

  async removeCategory(id: string, merchantId: string): Promise<void> {
    const category = await this.prisma.serviceCategory.findFirst({
      where: { id, merchantId },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // Check if category has services
    const serviceCount = await this.prisma.service.count({
      where: { categoryId: id },
    });

    if (serviceCount > 0) {
      throw new BadRequestException(
        'Cannot delete category with existing services. Please reassign or delete services first.',
      );
    }

    await this.prisma.serviceCategory.delete({
      where: { id },
    });
  }

  // ============= CSV IMPORT =============

  async importServices(
    merchantId: string,
    dto: ImportServicesDto,
  ): Promise<{
    imported: number;
    updated: number;
    skipped: number;
    errors: { row: number; error: string }[];
  }> {
    const results = {
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: [] as { row: number; error: string }[],
    };

    // Process categories first if needed
    if (dto.createCategories) {
      const uniqueCategories = [...new Set(dto.services.map(s => s.Category))];
      for (const categoryName of uniqueCategories) {
        if (categoryName) {
          await this.findOrCreateCategory(merchantId, categoryName);
        }
      }
    }

    // Process services
    for (let i = 0; i < dto.services.length; i++) {
      const row = i + 2; // Row number in CSV (header is row 1)
      const item = dto.services[i];

      try {
        const serviceData = await this.parseServiceImport(merchantId, item);
        
        // Check if service exists
        const existing = await this.prisma.service.findFirst({
          where: {
            merchantId,
            name: serviceData.name,
          },
        });

        if (existing) {
          if (dto.updateExisting) {
            await this.prisma.service.update({
              where: { id: existing.id },
              data: serviceData,
            });
            results.updated++;
          } else {
            results.skipped++;
          }
        } else {
          await this.prisma.service.create({
            data: {
              ...serviceData,
              merchantId,
            },
          });
          results.imported++;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push({
          row,
          error: errorMessage,
        });
      }
    }

    return results;
  }

  async parseCsvFile(buffer: Buffer): Promise<ServiceImportItem[]> {
    const { parse } = await import('csv-parse/sync');
    
    try {
      const records = parse(buffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      return records;
    } catch (error) {
      throw new BadRequestException('Invalid CSV file format');
    }
  }

  // ============= HELPER METHODS =============

  private async findOrCreateCategory(
    merchantId: string,
    categoryName: string,
  ): Promise<ServiceCategory> {
    let category = await this.prisma.serviceCategory.findFirst({
      where: {
        merchantId,
        name: categoryName,
      },
    });

    if (!category) {
      category = await this.prisma.serviceCategory.create({
        data: {
          merchantId,
          name: categoryName,
          isActive: true,
          sortOrder: 0,
        },
      });
    }

    return category;
  }

  private async parseServiceImport(
    merchantId: string,
    item: ServiceImportItem,
  ): Promise<any> {
    // Validate required fields
    if (!item['Service Name']) {
      throw new Error('Service name is required');
    }

    const price = parseFloat(String(item['Price']));
    if (isNaN(price) || price < 0) {
      throw new Error('Invalid price');
    }

    const duration = parseInt(String(item['Duration (min)']));
    if (isNaN(duration) || duration < 0) {
      throw new Error('Invalid duration');
    }

    // Find category if specified
    let categoryId: string | undefined;
    if (item['Category']) {
      const category = await this.findOrCreateCategory(merchantId, item['Category']);
      categoryId = category.id;
    }

    return {
      name: item['Service Name'],
      price,
      duration,
      category: item['Category'] || undefined,
      currency: 'AUD',
      taxRate: 0.1, // 10% GST
      isActive: true,
      requiresDeposit: false,
      maxAdvanceBooking: 90,
      minAdvanceBooking: 0,
      displayOrder: 0,
      ...(categoryId && { categoryId }),
    };
  }

  // ============= BULK OPERATIONS =============

  async updateDisplayOrder(
    merchantId: string,
    updates: { id: string; displayOrder: number }[],
  ): Promise<void> {
    // Verify all services belong to merchant
    const serviceIds = updates.map(u => u.id);
    const services = await this.prisma.service.findMany({
      where: {
        id: { in: serviceIds },
        merchantId,
      },
      select: { id: true },
    });

    if (services.length !== serviceIds.length) {
      throw new BadRequestException('One or more services not found');
    }

    // Update display order for each service
    await Promise.all(
      updates.map(update =>
        this.prisma.service.update({
          where: { id: update.id },
          data: { displayOrder: update.displayOrder },
        }),
      ),
    );
  }

  async bulkUpdateStatus(
    merchantId: string,
    serviceIds: string[],
    isActive: boolean,
  ): Promise<void> {
    await this.prisma.service.updateMany({
      where: {
        id: { in: serviceIds },
        merchantId,
      },
      data: { isActive },
    });
  }
}