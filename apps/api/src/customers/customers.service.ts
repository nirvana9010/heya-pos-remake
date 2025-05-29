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

    // If there's any text search, use raw SQL for case-insensitive search
    if (search || email || phone || firstName || lastName) {
      // Build the WHERE clause parts
      const conditions: string[] = ['merchantId = ?'];
      const params: any[] = [merchantId];
      
      if (search) {
        const searchPattern = `%${search.toLowerCase()}%`;
        conditions.push(`(
          LOWER(firstName) LIKE ? OR 
          LOWER(lastName) LIKE ? OR 
          LOWER(email) LIKE ? OR 
          LOWER(phone) LIKE ? OR 
          LOWER(mobile) LIKE ?
        )`);
        params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
      }
      
      if (email) {
        conditions.push('LOWER(email) LIKE ?');
        params.push(`%${email.toLowerCase()}%`);
      }
      
      if (phone) {
        conditions.push('(LOWER(phone) LIKE ? OR LOWER(mobile) LIKE ?)');
        params.push(`%${phone.toLowerCase()}%`, `%${phone.toLowerCase()}%`);
      }
      
      if (firstName) {
        conditions.push('LOWER(firstName) LIKE ?');
        params.push(`%${firstName.toLowerCase()}%`);
      }
      
      if (lastName) {
        conditions.push('LOWER(lastName) LIKE ?');
        params.push(`%${lastName.toLowerCase()}%`);
      }
      
      if (createdAfter) {
        conditions.push('createdAt >= ?');
        params.push(new Date(createdAfter).toISOString());
      }
      
      if (createdBefore) {
        conditions.push('createdAt <= ?');
        params.push(new Date(createdBefore).toISOString());
      }
      
      if (minTotalSpent !== undefined) {
        conditions.push('totalSpent >= ?');
        params.push(minTotalSpent);
      }
      
      if (maxTotalSpent !== undefined) {
        conditions.push('totalSpent <= ?');
        params.push(maxTotalSpent);
      }
      
      const whereClause = conditions.join(' AND ');
      const offset = (page - 1) * limit;
      const orderClause = `${sortBy || 'createdAt'} ${(sortOrder || 'desc').toUpperCase()}`;
      
      // Execute queries
      const [customers, countResult] = await Promise.all([
        this.prisma.$queryRawUnsafe<any[]>(
          `SELECT * FROM Customer
           WHERE ${whereClause}
           ORDER BY ${orderClause}
           LIMIT ? OFFSET ?`,
          ...params,
          limit,
          offset
        ),
        this.prisma.$queryRawUnsafe<{ count: bigint }[]>(
          `SELECT COUNT(*) as count FROM Customer WHERE ${whereClause}`,
          ...params
        ),
      ]);
      
      // Get booking counts for customers
      const customerIds = customers.map(c => c.id);
      const bookingCounts = customerIds.length > 0 ? await this.prisma.booking.groupBy({
        by: ['customerId'],
        where: { customerId: { in: customerIds } },
        _count: true,
      }) : [];
      
      const bookingCountMap = new Map(bookingCounts.map(b => [b.customerId, b._count]));
      
      // Transform raw results to match Prisma format
      const transformedCustomers = customers.map(customer => ({
        ...customer,
        dateOfBirth: customer.dateOfBirth ? new Date(customer.dateOfBirth) : null,
        tags: customer.tags ? JSON.parse(customer.tags) : [],
        marketingConsent: Boolean(customer.marketingConsent),
        createdAt: new Date(customer.createdAt),
        updatedAt: new Date(customer.updatedAt),
        _count: {
          bookings: bookingCountMap.get(customer.id) || 0,
        },
      }));
      
      const total = Number(countResult[0].count);
      
      return {
        data: transformedCustomers,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    }

    // Original Prisma query for non-search cases
    const where: Prisma.CustomerWhereInput = {
      merchantId,
      ...(createdAfter && { createdAt: { gte: new Date(createdAfter) } }),
      ...(createdBefore && { createdAt: { lte: new Date(createdBefore) } }),
      ...(minTotalSpent !== undefined && { totalSpent: { gte: minTotalSpent } }),
      ...(maxTotalSpent !== undefined && { totalSpent: { lte: maxTotalSpent } }),
    };

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