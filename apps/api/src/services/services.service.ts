import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { QueryServiceDto } from './dto/query-service.dto';
import { ImportOptionsDto, ImportPreviewRow, ImportPreviewDto, ImportResult, DuplicateAction, ImportServicesDto, ServiceImportItem, ImportAction } from './dto/import-services.dto';
import { CreateServiceCategoryDto } from './dto/create-category.dto';
import { UpdateServiceCategoryDto } from './dto/update-category.dto';
import { Service, ServiceCategory, Prisma } from '@prisma/client';
import { PaginatedResponse } from '../types';
import { CsvParserService } from './csv-parser.service';
import { MerchantService } from '../merchant/merchant.service';

// Extended Service type with categoryName
type ServiceWithCategoryName = Service & {
  categoryModel?: ServiceCategory | null;
  categoryName?: string | null;
};

@Injectable()
export class ServicesService {
  constructor(
    private prisma: PrismaService,
    private csvParser: CsvParserService,
    private merchantService: MerchantService,
  ) {}

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
        taxRate: dto.taxRate ?? 0.0, // Prices are GST-inclusive
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
        { name: { contains: searchTerm } },
        { description: { contains: searchTerm } },
        { category: { contains: searchTerm } },
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
          await this.findOrCreateCategory(merchantId, categoryName as string);
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

  // ============= NEW CSV IMPORT METHODS =============

  async previewImport(
    merchantId: string,
    file: Buffer,
    options: ImportOptionsDto,
    columnMappings?: Record<string, string>
  ): Promise<ImportPreviewDto> {
    // Get merchant settings for price-to-duration ratio
    const merchantSettings = await this.merchantService.getMerchantSettings(merchantId);
    
    // Parse CSV file with optional column mappings
    const rawRows = await this.csvParser.parseCsvFile(file, columnMappings);
    
    if (rawRows.length === 0) {
      throw new BadRequestException('CSV file is empty');
    }

    const rows: ImportPreviewRow[] = [];
    const summary = {
      total: rawRows.length,
      valid: 0,
      invalid: 0,
      duplicates: 0,
      toCreate: 0,
      toUpdate: 0,
      toSkip: 0,
      toDelete: 0,
    };

    // Process each row
    for (let i = 0; i < rawRows.length; i++) {
      const rowNumber = i + 2; // Account for header row
      const rawRow = rawRows[i];
      
      // Validate row
      const validation = this.csvParser.validateRow(rawRow, rowNumber, merchantSettings);
      
      // Transform row
      const data = this.csvParser.transformRow(rawRow, merchantSettings);
      
      // Check for existing service
      let action: 'create' | 'update' | 'skip' | 'delete' = 'create';
      let existingServiceId: string | undefined;
      
      if (validation.isValid) {
        const existing = await this.prisma.service.findFirst({
          where: {
            merchantId,
            name: data.name,
          },
        });

        // Handle explicit action from CSV
        if (data.action) {
          switch (data.action) {
            case ImportAction.ADD:
              if (existing) {
                summary.duplicates++;
                existingServiceId = existing.id;
                // Apply duplicate action strategy
                switch (options.duplicateAction) {
                  case DuplicateAction.UPDATE:
                    action = 'update';
                    summary.toUpdate++;
                    validation.warnings.push('Service exists - will update based on duplicate action setting');
                    break;
                  case DuplicateAction.SKIP:
                    action = 'skip';
                    summary.toSkip++;
                    validation.warnings.push('Service exists - will skip based on duplicate action setting');
                    break;
                  case DuplicateAction.CREATE_NEW:
                    action = 'create';
                    summary.toCreate++;
                    validation.warnings.push('Service exists - will create with modified name');
                    break;
                }
              } else {
                action = 'create';
                summary.toCreate++;
              }
              break;
            case ImportAction.EDIT:
              if (existing) {
                action = 'update';
                existingServiceId = existing.id;
                summary.toUpdate++;
              } else {
                validation.errors.push('Cannot edit - service does not exist');
                action = 'skip';
                summary.toSkip++;
              }
              break;
            case ImportAction.DELETE:
              if (existing) {
                action = 'delete';
                existingServiceId = existing.id;
                summary.toDelete++;
              } else {
                validation.warnings.push('Cannot delete - service does not exist');
                action = 'skip';
                summary.toSkip++;
              }
              break;
          }
        } else {
          // No explicit action - use existing logic
          if (existing) {
            summary.duplicates++;
            existingServiceId = existing.id;
            
            switch (options.duplicateAction) {
              case DuplicateAction.UPDATE:
                action = 'update';
                summary.toUpdate++;
                break;
              case DuplicateAction.SKIP:
                action = 'skip';
                summary.toSkip++;
                break;
              case DuplicateAction.CREATE_NEW:
                // Will append number to name during import
                action = 'create';
                summary.toCreate++;
                validation.warnings.push('Will create with modified name');
                break;
            }
          } else {
            summary.toCreate++;
          }
        }
        summary.valid++;
      } else {
        summary.invalid++;
        if (options.skipInvalidRows) {
          action = 'skip';
          summary.toSkip++;
        }
      }

      rows.push({
        rowNumber,
        data,
        validation,
        action,
        existingServiceId,
      });
    }

    return { rows, summary };
  }

  async executeImport(
    merchantId: string,
    rows: ImportPreviewRow[],
    options: ImportOptionsDto
  ): Promise<ImportResult> {
    // Get merchant settings for price-to-duration ratio
    const merchantSettings = await this.merchantService.getMerchantSettings(merchantId);
    
    const result: ImportResult = {
      success: true,
      imported: 0,
      updated: 0,
      skipped: 0,
      deleted: 0,
      failed: 0,
      errors: [],
    };

    // Use transaction for data integrity with extended timeout
    await this.prisma.$transaction(async (tx) => {
      for (const row of rows) {
        if (row.action === 'skip' || !row.validation.isValid) {
          result.skipped++;
          continue;
        }

        try {
          const { data } = row;
          
          // Handle delete action
          if (row.action === 'delete' && row.existingServiceId) {
            // Check if service is used in any bookings
            const bookingCount = await tx.bookingService.count({
              where: { serviceId: row.existingServiceId },
            });

            if (bookingCount > 0) {
              // Soft delete by deactivating
              await tx.service.update({
                where: { id: row.existingServiceId },
                data: { isActive: false },
              });
            } else {
              // Hard delete if not used
              await tx.service.delete({
                where: { id: row.existingServiceId },
              });
            }
            result.deleted++;
            continue;
          }
          
          // Parse duration to minutes
          let duration: number;
          if (data.duration) {
            duration = this.csvParser.parseDuration(data.duration);
          } else if (data.price > 0 && merchantSettings?.priceToDurationRatio) {
            // Calculate duration from price if not provided
            duration = this.csvParser.calculateDurationFromPrice(data.price, merchantSettings.priceToDurationRatio);
          } else {
            // This shouldn't happen if validation is working correctly
            throw new Error('Duration is required');
          }
          
          // Find or create category if specified
          let categoryId: string | undefined;
          if (data.category && options.createCategories) {
            // Check if category exists
            let category = await tx.serviceCategory.findFirst({
              where: {
                merchantId,
                name: data.category,
              },
            });

            if (!category) {
              // Create new category
              const categoryCount = await tx.serviceCategory.count({
                where: { merchantId },
              });

              // Use a simple color selection
              const AVAILABLE_COLORS = [
                '#8B5CF6', '#EC4899', '#EF4444', '#F59E0B', '#10B981',
                '#3B82F6', '#14B8A6', '#84CC16', '#06B6D4', '#F97316'
              ];
              const colorIndex = categoryCount % AVAILABLE_COLORS.length;

              category = await tx.serviceCategory.create({
                data: {
                  merchantId,
                  name: data.category,
                  color: AVAILABLE_COLORS[colorIndex],
                  sortOrder: categoryCount,
                  isActive: true,
                },
              });
            }
            
            categoryId = category.id;
          }

          // Prepare service data using merchant settings for global values
          const serviceData = {
            name: data.name,
            description: data.description,
            duration,
            price: data.price,
            currency: merchantSettings.currency || 'AUD',
            taxRate: data.tax_rate ?? 0.1, // Use CSV value if present, else default GST
            isActive: data.active ?? true,
            requiresDeposit: data.deposit_required ?? merchantSettings.requireDeposit ?? false,
            depositAmount: data.deposit_amount ?? (merchantSettings.requireDeposit && merchantSettings.depositPercentage 
              ? (data.price * merchantSettings.depositPercentage / 100) 
              : undefined),
            maxAdvanceBooking: data.max_advance_days ?? (merchantSettings.bookingAdvanceHours 
              ? Math.ceil(merchantSettings.bookingAdvanceHours / 24) 
              : 90),
            minAdvanceBooking: data.min_advance_hours ?? 0,
            displayOrder: 0,
            merchantId,
            categoryId,
          };

          if (row.action === 'update' && row.existingServiceId) {
            // Update existing service
            await tx.service.update({
              where: { id: row.existingServiceId },
              data: serviceData,
            });
            result.updated++;
          } else if (row.action === 'create') {
            // Handle duplicate names if creating new
            let finalName = serviceData.name;
            if (row.existingServiceId && options.duplicateAction === DuplicateAction.CREATE_NEW) {
              // Find a unique name by appending a number
              let counter = 2;
              let nameExists = true;
              while (nameExists) {
                finalName = `${serviceData.name} (${counter})`;
                const existing = await tx.service.findFirst({
                  where: {
                    merchantId,
                    name: finalName,
                  },
                });
                nameExists = !!existing;
                counter++;
              }
            }

            // Create new service
            await tx.service.create({
              data: {
                ...serviceData,
                name: finalName,
              },
            });
            result.imported++;
          }
        } catch (error) {
          result.failed++;
          result.errors.push({
            row: row.rowNumber,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          
          // If not skipping invalid rows, throw to rollback transaction
          if (!options.skipInvalidRows) {
            throw error;
          }
        }
      }
    }, {
      maxWait: 5000, // Max time to wait for a transaction slot
      timeout: 30000, // Transaction timeout: 30 seconds for large imports
    });

    result.success = result.failed === 0 || options.skipInvalidRows;
    return result;
  }

  // Removed findOrCreateCategoryInTx - inline transaction operations instead
  private async findOrCreateCategoryOLD(
    tx: Prisma.TransactionClient,
    merchantId: string,
    categoryName: string
  ): Promise<ServiceCategory> {
    // Predefined colors from the UI
    const AVAILABLE_COLORS = [
      '#8B5CF6', '#EC4899', '#EF4444', '#F59E0B', '#10B981',
      '#3B82F6', '#14B8A6', '#84CC16', '#06B6D4', '#F97316'
    ];

    // Check if category exists
    const existing = await tx.serviceCategory.findFirst({
      where: {
        merchantId,
        name: categoryName,
      },
    });

    if (existing) {
      return existing;
    }

    // Get all existing categories to check which colors are in use
    const existingCategories = await tx.serviceCategory.findMany({
      where: { merchantId },
      select: { color: true },
    });

    const usedColors = new Set(
      existingCategories
        .map(cat => cat.color)
        .filter(color => color && AVAILABLE_COLORS.includes(color))
    );

    // Find unused colors
    const unusedColors = AVAILABLE_COLORS.filter(color => !usedColors.has(color));
    
    let selectedColor: string;
    
    if (unusedColors.length > 0) {
      // Randomly select from unused colors
      selectedColor = unusedColors[Math.floor(Math.random() * unusedColors.length)];
    } else {
      // Fallback: If all colors are used, generate a color based on category name hash
      // This ensures the same category name always gets the same color
      const hash = categoryName.split('').reduce((acc, char) => {
        return char.charCodeAt(0) + ((acc << 5) - acc);
      }, 0);
      
      // Use the hash to pick a color and slightly modify it
      const baseColor = AVAILABLE_COLORS[Math.abs(hash) % AVAILABLE_COLORS.length];
      
      // Create a slight variation by adjusting the lightness
      // Convert hex to HSL, adjust lightness, convert back
      const hexToHSL = (hex: string) => {
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const l = (max + min) / 2;
        let h = 0;
        let s = 0;
        
        if (max !== min) {
          const d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
          }
        }
        
        return { h: h * 360, s: s * 100, l: l * 100 };
      };
      
      const hslToHex = (h: number, s: number, l: number) => {
        h = h / 360;
        s = s / 100;
        l = l / 100;
        
        let r, g, b;
        
        if (s === 0) {
          r = g = b = l;
        } else {
          const hue2rgb = (p: number, q: number, t: number) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
          };
          
          const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
          const p = 2 * l - q;
          r = hue2rgb(p, q, h + 1/3);
          g = hue2rgb(p, q, h);
          b = hue2rgb(p, q, h - 1/3);
        }
        
        const toHex = (x: number) => {
          const hex = Math.round(x * 255).toString(16);
          return hex.length === 1 ? '0' + hex : hex;
        };
        
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
      };
      
      const hsl = hexToHSL(baseColor);
      // Adjust lightness based on hash to create variation
      const adjustedLightness = hsl.l + ((hash % 20) - 10);
      const boundedLightness = Math.max(30, Math.min(70, adjustedLightness));
      
      selectedColor = hslToHex(hsl.h, hsl.s, boundedLightness);
    }

    // Create new category
    const categoryCount = await tx.serviceCategory.count({
      where: { merchantId },
    });

    return await tx.serviceCategory.create({
      data: {
        merchantId,
        name: categoryName,
        color: selectedColor,
        sortOrder: categoryCount,
        isActive: true,
      },
    });
  }
}