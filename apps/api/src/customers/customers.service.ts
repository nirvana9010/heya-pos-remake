import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { SearchCustomersDto, CustomerSortBy } from './dto/search-customers.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async create(merchantId: string, dto: CreateCustomerDto) {
    // Check if customer with email already exists for this merchant
    if (dto.email) {
      const existing = await this.prisma.customer.findFirst({
        where: {
          merchantId,
          email: dto.email,
        },
      });

      if (existing) {
        throw new ConflictException('Customer with this email already exists');
      }
    }

    // Check if mobile number is already in use
    if (dto.mobile) {
      const existingMobile = await this.prisma.customer.findFirst({
        where: {
          merchantId,
          mobile: dto.mobile,
        },
      });

      if (existingMobile) {
        throw new ConflictException('Customer with this mobile number already exists');
      }
    }

    return this.prisma.customer.create({
      data: {
        ...dto,
        merchantId,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      },
    });
  }

  async findAll(merchantId: string, params: SearchCustomersDto) {
    const {
      search,
      email,
      phone,
      firstName,
      lastName,
      createdAfter,
      createdBefore,
      minTotalSpent,
      maxTotalSpent,
      sortBy,
      sortOrder,
      page,
      limit,
    } = params;

    // Build where clause for Prisma query
    const where: Prisma.CustomerWhereInput = {
      merchantId,
      ...(createdAfter && { createdAt: { gte: new Date(createdAfter) } }),
      ...(createdBefore && { createdAt: { lte: new Date(createdBefore) } }),
      ...(minTotalSpent !== undefined && { totalSpent: { gte: minTotalSpent } }),
      ...(maxTotalSpent !== undefined && { totalSpent: { lte: maxTotalSpent } }),
    };

    // Add search conditions
    const searchConditions: any[] = [];
    
    if (search) {
      searchConditions.push(
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { mobile: { contains: search, mode: 'insensitive' } }
      );
    }
    
    if (email) {
      searchConditions.push({ email: { contains: email, mode: 'insensitive' } });
    }
    
    if (phone) {
      searchConditions.push(
        { phone: { contains: phone, mode: 'insensitive' } },
        { mobile: { contains: phone, mode: 'insensitive' } }
      );
    }
    
    if (firstName) {
      searchConditions.push({ firstName: { contains: firstName, mode: 'insensitive' } });
    }
    
    if (lastName) {
      searchConditions.push({ lastName: { contains: lastName, mode: 'insensitive' } });
    }
    
    // If we have any search conditions, add them as OR conditions
    if (searchConditions.length > 0) {
      if (email || firstName || lastName) {
        // For specific field searches, use AND logic
        Object.assign(where, {
          ...(email && { email: { contains: email, mode: 'insensitive' } }),
          ...(firstName && { firstName: { contains: firstName, mode: 'insensitive' } }),
          ...(lastName && { lastName: { contains: lastName, mode: 'insensitive' } }),
        });
        
        if (phone) {
          where.OR = [
            { phone: { contains: phone, mode: 'insensitive' } },
            { mobile: { contains: phone, mode: 'insensitive' } }
          ];
        }
      } else if (search) {
        // For general search, use OR logic
        where.OR = searchConditions;
      }
    }


    const orderBy = this.buildOrderBy(sortBy, sortOrder);

    const [customers, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: {
            select: {
              bookings: true,
            },
          },
        },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      data: customers,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(merchantId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: {
        id,
        merchantId,
      },
      include: {
        bookings: {
          take: 10,
          orderBy: { startTime: 'desc' },
          include: {
            services: {
              include: {
                service: true,
              },
            },
            provider: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        invoices: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return customer;
  }

  async update(merchantId: string, id: string, dto: UpdateCustomerDto) {
    const customer = await this.findOne(merchantId, id);

    // Check for email conflicts
    if (dto.email && dto.email !== customer.email) {
      const existing = await this.prisma.customer.findFirst({
        where: {
          merchantId,
          email: dto.email,
          NOT: { id },
        },
      });

      if (existing) {
        throw new ConflictException('Customer with this email already exists');
      }
    }

    // Check for mobile conflicts
    if (dto.mobile && dto.mobile !== customer.mobile) {
      const existing = await this.prisma.customer.findFirst({
        where: {
          merchantId,
          mobile: dto.mobile,
          NOT: { id },
        },
      });

      if (existing) {
        throw new ConflictException('Customer with this mobile number already exists');
      }
    }

    return this.prisma.customer.update({
      where: { id },
      data: {
        ...dto,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      },
    });
  }

  async remove(merchantId: string, id: string) {
    await this.findOne(merchantId, id);

    // Check if customer has any bookings
    const bookingCount = await this.prisma.booking.count({
      where: { customerId: id },
    });

    if (bookingCount > 0) {
      // Soft delete - anonymize data instead of deleting
      return this.prisma.customer.update({
        where: { id },
        data: {
          email: `deleted_${id}@deleted.com`,
          firstName: 'Deleted',
          lastName: 'Customer',
          phone: null,
          mobile: null,
          dateOfBirth: null,
          address: null,
          suburb: null,
          city: null,
          state: null,
          country: null,
          postalCode: null,
          notes: null,
          tags: [],
          marketingConsent: false,
        },
      });
    }

    // Hard delete if no bookings
    return this.prisma.customer.delete({
      where: { id },
    });
  }

  async importCustomers(merchantId: string, file: Express.Multer.File) {
    if (!file || !file.buffer) {
      throw new BadRequestException('No file uploaded');
    }

    const customers = await this.parseCsvFile(file.buffer);
    const results = {
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: [] as { row: number; error: string }[],
    };

    for (let i = 0; i < customers.length; i++) {
      const row = i + 2; // Account for header row
      try {
        const customerData = this.parseCustomerImport(customers[i]);
        
        // Check if customer exists by email or mobile
        let existing = null;
        if (customerData.email) {
          existing = await this.prisma.customer.findFirst({
            where: {
              merchantId,
              email: customerData.email,
            },
          });
        }
        
        if (!existing && customerData.mobile) {
          existing = await this.prisma.customer.findFirst({
            where: {
              merchantId,
              mobile: customerData.mobile,
            },
          });
        }

        if (existing) {
          // Update existing customer
          await this.prisma.customer.update({
            where: { id: existing.id },
            data: customerData,
          });
          results.updated++;
        } else {
          // Create new customer
          await this.prisma.customer.create({
            data: {
              ...customerData,
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

  async exportCustomers(merchantId: string, format: 'csv' | 'json' = 'csv') {
    const customers = await this.prisma.customer.findMany({
      where: { merchantId },
      include: {
        _count: {
          select: {
            bookings: true,
          },
        },
      },
    });

    if (format === 'json') {
      return customers;
    }

    // Generate CSV
    const headers = [
      'Email',
      'First Name',
      'Last Name',
      'Phone',
      'Mobile',
      'Date of Birth',
      'Gender',
      'Address',
      'Suburb',
      'City',
      'State',
      'Postal Code',
      'Country',
      'Total Spent',
      'Visit Count',
      'Loyalty Points',
      'Marketing Consent',
      'Source',
      'Created Date',
    ];

    const rows = customers.map(customer => [
      customer.email || '',
      customer.firstName,
      customer.lastName,
      customer.phone || '',
      customer.mobile || '',
      customer.dateOfBirth ? customer.dateOfBirth.toISOString().split('T')[0] : '',
      customer.gender || '',
      customer.address || '',
      customer.suburb || '',
      customer.city || '',
      customer.state || '',
      customer.postalCode || '',
      customer.country || '',
      customer.totalSpent.toString(),
      customer.visitCount.toString(),
      customer.loyaltyPoints.toString(),
      customer.marketingConsent ? 'Yes' : 'No',
      customer.source || '',
      customer.createdAt.toISOString(),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    return csvContent;
  }

  private buildOrderBy(sortBy: CustomerSortBy, sortOrder: 'asc' | 'desc'): Prisma.CustomerOrderByWithRelationInput {
    switch (sortBy) {
      case CustomerSortBy.NAME:
        return { firstName: sortOrder };
      case CustomerSortBy.EMAIL:
        return { email: sortOrder };
      case CustomerSortBy.TOTAL_SPENT:
        return { totalSpent: sortOrder };
      case CustomerSortBy.CREATED_AT:
      default:
        return { createdAt: sortOrder };
    }
  }

  private async parseCsvFile(buffer: Buffer): Promise<any[]> {
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

  private parseCustomerImport(item: any) {
    // Validate required fields
    if (!item['First Name'] || !item['Last Name']) {
      throw new Error('First Name and Last Name are required');
    }

    return {
      email: item['Email'] || undefined,
      firstName: item['First Name'],
      lastName: item['Last Name'],
      phone: item['Phone'] || undefined,
      mobile: item['Mobile'] || undefined,
      dateOfBirth: item['Date of Birth'] ? new Date(item['Date of Birth']) : undefined,
      gender: item['Gender'] || undefined,
      address: item['Address'] || undefined,
      suburb: item['Suburb'] || undefined,
      city: item['City'] || undefined,
      state: item['State'] || undefined,
      postalCode: item['Postal Code'] || undefined,
      country: item['Country'] || undefined,
      marketingConsent: item['Marketing Consent'] === 'true' || item['Marketing Consent'] === '1' || item['Marketing Consent'] === 'Yes',
      source: item['Source'] || 'MIGRATED',
      tags: item['Tags'] ? item['Tags'].split(',').map((t: string) => t.trim()) : [],
      preferredLanguage: item['Preferred Language'] || 'en',
    };
  }
}