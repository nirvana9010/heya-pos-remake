import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateCustomerDto } from "./dto/create-customer.dto";
import { UpdateCustomerDto } from "./dto/update-customer.dto";
import { SearchCustomersDto, CustomerSortBy } from "./dto/search-customers.dto";
import { Prisma } from "@prisma/client";
import { CacheService } from "../common/cache/cache.service";
import {
  ResourceNotFoundException,
  DuplicateResourceException,
  BusinessRuleViolationException,
} from "../common/exceptions/business-exception";
import { ErrorCodes } from "../common/exceptions/error-codes";
import {
  CustomerDuplicateAction,
  CustomerImportData,
  CustomerImportOptionsDto,
  CustomerImportPreviewDto,
  CustomerImportPreviewRow,
  CustomerImportSummary,
  CustomerImportResultDto,
} from "./dto/import-customers.dto";

@Injectable()
export class CustomersService {
  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
  ) {}

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
        throw new DuplicateResourceException("Customer", "email", dto.email);
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
        throw new DuplicateResourceException("Customer", "mobile", dto.mobile);
      }
    }

    const customer = await this.prisma.customer.create({
      data: {
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        mobile: dto.mobile,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        gender: dto.gender,
        address: dto.address,
        suburb: dto.suburb,
        city: dto.city,
        state: dto.state,
        country: dto.country,
        postalCode: dto.postalCode,
        notes: dto.notes,
        tags: dto.tags,
        preferredLanguage: dto.preferredLanguage,
        marketingConsent: dto.marketingConsent,
        source: dto.source,
        merchantId,
      },
    });

    await this.invalidateCustomerCache(merchantId);

    return customer;
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

    // Generate cache key
    const cacheKey = this.cacheService.generateKey(
      merchantId,
      "customers-list",
      JSON.stringify(params),
    );

    // Try to get from cache first
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Build where clause for Prisma query
    const where: Prisma.CustomerWhereInput = {
      merchantId,
      ...(createdAfter && { createdAt: { gte: new Date(createdAfter) } }),
      ...(createdBefore && { createdAt: { lte: new Date(createdBefore) } }),
      ...(minTotalSpent !== undefined && {
        totalSpent: { gte: minTotalSpent },
      }),
      ...(maxTotalSpent !== undefined && {
        totalSpent: { lte: maxTotalSpent },
      }),
    };

    // Add search conditions
    const searchConditions: any[] = [];

    if (search) {
      searchConditions.push(
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { mobile: { contains: search, mode: "insensitive" } },
      );
    }

    if (email) {
      searchConditions.push({
        email: { contains: email, mode: "insensitive" },
      });
    }

    if (phone) {
      searchConditions.push(
        { phone: { contains: phone, mode: "insensitive" } },
        { mobile: { contains: phone, mode: "insensitive" } },
      );
    }

    if (firstName) {
      searchConditions.push({
        firstName: { contains: firstName, mode: "insensitive" },
      });
    }

    if (lastName) {
      searchConditions.push({
        lastName: { contains: lastName, mode: "insensitive" },
      });
    }

    // If we have any search conditions, add them as OR conditions
    if (searchConditions.length > 0) {
      if (email || firstName || lastName) {
        // For specific field searches, use AND logic
        Object.assign(where, {
          ...(email && { email: { contains: email, mode: "insensitive" } }),
          ...(firstName && {
            firstName: { contains: firstName, mode: "insensitive" },
          }),
          ...(lastName && {
            lastName: { contains: lastName, mode: "insensitive" },
          }),
        });

        if (phone) {
          where.OR = [
            { phone: { contains: phone, mode: "insensitive" } },
            { mobile: { contains: phone, mode: "insensitive" } },
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
        select: {
          id: true,
          merchantId: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          mobile: true,
          dateOfBirth: true,
          gender: true,
          address: true,
          suburb: true,
          city: true,
          state: true,
          country: true,
          postalCode: true,
          notes: true,
          tags: true,
          preferredLanguage: true,
          marketingConsent: true,
          status: true,
          source: true,
          loyaltyPoints: true,
          visitCount: true,
          totalSpent: true,
          loyaltyVisits: true,
          lifetimeVisits: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              bookings: true,
            },
          },
        },
      }),
      this.prisma.customer.count({ where }),
    ]);

    const result = {
      data: customers,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };

    // Cache the result for 2 minutes
    await this.cacheService.set(cacheKey, result, 120000);

    return result;
  }

  async searchCustomers(merchantId: string, query: string) {
    const trimmedQuery = query.trim();
    const digitQuery = trimmedQuery.replace(/\D/g, "");

    const stringConditions: Prisma.Sql[] = [];

    if (trimmedQuery.length >= 2) {
      const likeValue = `%${trimmedQuery}%`;
      stringConditions.push(Prisma.sql`"firstName" ILIKE ${likeValue}`);
      stringConditions.push(Prisma.sql`"lastName" ILIKE ${likeValue}`);
      stringConditions.push(Prisma.sql`"email" ILIKE ${likeValue}`);
      // Search concatenated full name (firstName + lastName) to handle multi-word queries
      stringConditions.push(
        Prisma.sql`CONCAT("firstName", ' ', COALESCE("lastName", '')) ILIKE ${likeValue}`,
      );
    }

    const phonePatterns = this.buildPhoneSearchPatterns(digitQuery);

    const conditions: Prisma.Sql[] = [...stringConditions];

    if (phonePatterns.length > 0) {
      const patternArray = Prisma.sql`ARRAY[${Prisma.join(
        phonePatterns.map((pattern) => Prisma.sql`${pattern}`),
        ", ",
      )}]`;

      conditions.push(
        Prisma.sql`
          regexp_replace(coalesce("phone", ''), '[^0-9]', '', 'g') LIKE ANY(${patternArray})
          OR regexp_replace(coalesce("mobile", ''), '[^0-9]', '', 'g') LIKE ANY(${patternArray})
        `,
      );
    }

    if (conditions.length === 0) {
      return {
        data: [],
        displayed: 0,
        total: 0,
        hasMore: false,
      };
    }

    const combinedCondition = Prisma.sql`${Prisma.join(
      conditions.map((condition) => Prisma.sql`(${condition})`),
      " OR ",
    )}`;

    const baseWhere = Prisma.sql`"merchantId" = ${merchantId} AND (${combinedCondition})`;

    // First, get a count of total matching customers
    const totalResult = await this.prisma.$queryRaw<{ count: bigint }[]>(
      Prisma.sql`
        SELECT COUNT(*)::bigint AS count
        FROM "Customer"
        WHERE ${baseWhere}
      `,
    );

    const totalCount = totalResult[0]?.count ? Number(totalResult[0].count) : 0;

    // Then get the most relevant results
    const customers = await this.prisma.$queryRaw<
      Array<{
        id: string;
        firstName: string | null;
        lastName: string | null;
        email: string | null;
        phone: string | null;
        mobile: string | null;
        visitCount: number;
        totalSpent: Prisma.Decimal;
        createdAt: Date;
      }>
    >(
      Prisma.sql`
        SELECT "id",
               "firstName",
               "lastName",
               "email",
               "phone",
               "mobile",
               "visitCount",
               "totalSpent",
               "createdAt"
        FROM "Customer"
        WHERE ${baseWhere}
        ORDER BY "visitCount" DESC,
                 "totalSpent" DESC,
                 "firstName" ASC,
                 "lastName" ASC
        LIMIT 50
      `,
    );

    return {
      data: customers.map((customer) => ({
        ...customer,
        totalSpent: customer.totalSpent
          ? typeof customer.totalSpent === "object" &&
            "toNumber" in customer.totalSpent
            ? customer.totalSpent.toNumber()
            : Number(customer.totalSpent)
          : 0,
      })),
      displayed: customers.length,
      total: totalCount,
      hasMore: totalCount > customers.length,
    };
  }

  private buildPhoneSearchPatterns(digitsOnly: string): string[] {
    if (!digitsOnly) {
      return [];
    }

    const sanitized = digitsOnly.replace(/\D/g, "");
    if (!sanitized) {
      return [];
    }

    const variants = new Set<string>();

    if (sanitized.length >= 3) {
      variants.add(sanitized);
    }

    const withoutLeadingZero = sanitized.replace(/^0+/, "");
    if (withoutLeadingZero && withoutLeadingZero.length >= 3) {
      variants.add(withoutLeadingZero);
    }

    if (sanitized.startsWith("61") && sanitized.length >= 5) {
      const withoutCountry = sanitized.slice(2);
      if (withoutCountry.length >= 3) {
        variants.add(withoutCountry);
      }
    }

    if (withoutLeadingZero && withoutLeadingZero.length >= 3) {
      const withCountry = `61${withoutLeadingZero}`;
      variants.add(withCountry);
    }

    return Array.from(variants)
      .filter((value) => value.length >= 3)
      .map((value) => `%${value}%`);
  }

  async getStats(merchantId: string) {
    const [total, vipCustomers, newThisMonth, revenueResult] =
      await Promise.all([
        // Total customers
        this.prisma.customer.count({
          where: { merchantId },
        }),

        // VIP customers (spent > 1000 or visits > 10)
        this.prisma.customer.count({
          where: {
            merchantId,
            OR: [{ totalSpent: { gt: 1000 } }, { visitCount: { gt: 10 } }],
          },
        }),

        // New customers this month (visits = 0)
        this.prisma.customer.count({
          where: {
            merchantId,
            visitCount: 0,
          },
        }),

        // Total revenue
        this.prisma.customer.aggregate({
          where: { merchantId },
          _sum: {
            totalSpent: true,
          },
        }),
      ]);

    return {
      total,
      vip: vipCustomers,
      newThisMonth,
      totalRevenue: Number(revenueResult._sum.totalSpent || 0),
    };
  }

  async findOne(merchantId: string, id: string) {
    // Handle special walk-in customer ID
    if (id === "WALK_IN") {
      return this.findOrCreateWalkInCustomer(merchantId);
    }

    const customer = await this.prisma.customer.findFirst({
      where: {
        id,
        merchantId,
      },
      include: {
        bookings: {
          take: 10,
          orderBy: { startTime: "desc" },
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
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!customer) {
      throw new ResourceNotFoundException("Customer", id);
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
        throw new DuplicateResourceException("Customer", "email", dto.email);
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
        throw new DuplicateResourceException("Customer", "mobile", dto.mobile);
      }
    }

    const updatedCustomer = await this.prisma.customer.update({
      where: { id },
      data: {
        ...dto,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      },
    });

    await this.invalidateCustomerCache(merchantId);

    return updatedCustomer;
  }

  async remove(merchantId: string, id: string) {
    await this.findOne(merchantId, id);

    // Check if customer has any bookings
    const bookingCount = await this.prisma.booking.count({
      where: { customerId: id },
    });

    if (bookingCount > 0) {
      // Soft delete - anonymize data instead of deleting
      const anonymizedCustomer = await this.prisma.customer.update({
        where: { id },
        data: {
          email: `deleted_${id}@deleted.com`,
          firstName: "Deleted",
          lastName: "Customer",
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

      await this.invalidateCustomerCache(merchantId);

      return anonymizedCustomer;
    }

    // Hard delete if no bookings
    const deletedCustomer = await this.prisma.customer.delete({
      where: { id },
    });

    await this.invalidateCustomerCache(merchantId);

    return deletedCustomer;
  }

  private async invalidateCustomerCache(merchantId: string) {
    await this.cacheService.deletePattern(`^${merchantId}:customers-list`);
  }

  async importCustomers(
    merchantId: string,
    file: Express.Multer.File,
  ): Promise<CustomerImportResultDto> {
    if (!file || !file.buffer) {
      throw new BusinessRuleViolationException(
        "FILE_REQUIRED",
        "No file uploaded",
      );
    }

    const options: CustomerImportOptionsDto = {
      duplicateAction: CustomerDuplicateAction.UPDATE,
      skipInvalidRows: true,
    };

    const preview = await this.previewCustomerImport(
      merchantId,
      file.buffer,
      options,
    );

    const execution = await this.executeCustomerImport(
      merchantId,
      preview.rows,
      options,
    );

    return execution;
  }

  async getCustomerImportMapping(file: Express.Multer.File) {
    if (!file || !file.buffer) {
      throw new BusinessRuleViolationException(
        "FILE_REQUIRED",
        "No file uploaded",
      );
    }

    return this.parseCsvForMapping(file.buffer);
  }

  async previewCustomerImport(
    merchantId: string,
    buffer: Buffer,
    options: CustomerImportOptionsDto = {
      duplicateAction: CustomerDuplicateAction.UPDATE,
      skipInvalidRows: true,
    },
    columnMappings?: Record<string, string>,
  ): Promise<CustomerImportPreviewDto> {
    const customers = await this.parseCsvFile(buffer, columnMappings);

    if (!customers.length) {
      throw new BusinessRuleViolationException(
        "INVALID_FILE_FORMAT",
        "CSV file is empty",
      );
    }

    const rows: CustomerImportPreviewRow[] = [];
    const summary: CustomerImportSummary = {
      total: customers.length,
      valid: 0,
      invalid: 0,
      duplicates: 0,
      toCreate: 0,
      toUpdate: 0,
      toSkip: 0,
    };

    for (let i = 0; i < customers.length; i++) {
      const rowNumber = i + 2; // Header offset
      const originalRow = customers[i];
      const validation = {
        isValid: true,
        errors: [] as string[],
        warnings: [] as string[],
      };
      let data = undefined;
      let action: "create" | "update" | "skip" = "create";
      let existingCustomerId: string | undefined;

      try {
        data = this.parseCustomerImport(originalRow);
      } catch (error) {
        validation.isValid = false;
        validation.errors.push(
          error instanceof Error ? error.message : "Unknown error",
        );
      }

      if (validation.isValid && data) {
        summary.valid++;

        if (!data.email && !data.mobile) {
          validation.warnings.push(
            "No email or mobile provided. Duplicate detection will be skipped.",
          );
        }

        let existing = null;
        if (data.email) {
          existing = await this.prisma.customer.findFirst({
            where: {
              merchantId,
              email: data.email,
            },
          });
        }

        if (!existing && data.mobile) {
          existing = await this.prisma.customer.findFirst({
            where: {
              merchantId,
              mobile: data.mobile,
            },
          });
        }

        if (existing) {
          existingCustomerId = existing.id;
          summary.duplicates++;

          if (options.duplicateAction === CustomerDuplicateAction.UPDATE) {
            action = "update";
            summary.toUpdate++;
          } else {
            action = "skip";
            summary.toSkip++;
            validation.warnings.push("Existing customer will be skipped.");
          }
        } else {
          summary.toCreate++;
        }
      } else {
        summary.invalid++;
        if (options.skipInvalidRows) {
          action = "skip";
          summary.toSkip++;
        }
      }

      rows.push({
        rowNumber,
        original: originalRow,
        data,
        validation,
        action,
        existingCustomerId,
      });
    }

    return { rows, summary };
  }

  async executeCustomerImport(
    merchantId: string,
    rows: CustomerImportPreviewRow[],
    options: CustomerImportOptionsDto = {
      duplicateAction: CustomerDuplicateAction.UPDATE,
      skipInvalidRows: true,
    },
  ): Promise<CustomerImportResultDto> {
    const result: CustomerImportResultDto = {
      success: true,
      imported: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      errors: [],
    };

    for (const row of rows) {
      if (!row.data || row.action === "skip") {
        result.skipped++;
        continue;
      }

      if (!row.validation?.isValid && options.skipInvalidRows) {
        result.skipped++;
        continue;
      }

      const { createdAtOverride, ...dataForSanitizing } = row.data as {
        createdAtOverride?: Date;
      } & CustomerImportData;
      const customerData =
        this.prepareCustomerDataForPersistence(dataForSanitizing);

      try {
        if (row.action === "update") {
          let targetCustomerId = row.existingCustomerId;

          if (!targetCustomerId) {
            if (row.data.email) {
              const emailMatch = await this.prisma.customer.findFirst({
                where: {
                  merchantId,
                  email: row.data.email,
                },
              });
              targetCustomerId = emailMatch?.id;
            }

            if (!targetCustomerId && row.data.mobile) {
              const mobileMatch = await this.prisma.customer.findFirst({
                where: {
                  merchantId,
                  mobile: row.data.mobile,
                },
              });
              targetCustomerId = mobileMatch?.id;
            }
          }

          if (!targetCustomerId) {
            throw new Error("Unable to locate matching customer for update");
          }

          await this.prisma.customer.update({
            where: { id: targetCustomerId },
            data: customerData,
          });
          result.updated++;
        } else {
          await this.prisma.customer.create({
            data: {
              ...customerData,
              merchantId,
              ...(createdAtOverride ? { createdAt: createdAtOverride } : {}),
            } as Prisma.CustomerUncheckedCreateInput,
          });
          result.imported++;
        }
      } catch (error) {
        result.failed++;
        result.errors.push({
          row: row.rowNumber,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        result.success = false;
      }
    }

    return result;
  }

  async exportCustomers(merchantId: string, format: "csv" | "json" = "csv") {
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

    if (format === "json") {
      return customers;
    }

    // Generate CSV
    const headers = [
      "Email",
      "First Name",
      "Last Name",
      "Phone",
      "Mobile",
      "Date of Birth",
      "Gender",
      "Address",
      "Suburb",
      "City",
      "State",
      "Postal Code",
      "Country",
      "Total Spent",
      "Visit Count",
      "Loyalty Points",
      "Marketing Consent",
      "Source",
      "Created Date",
    ];

    const rows = customers.map((customer) => [
      customer.email || "",
      customer.firstName,
      customer.lastName,
      customer.phone || "",
      customer.mobile || "",
      customer.dateOfBirth
        ? customer.dateOfBirth.toISOString().split("T")[0]
        : "",
      customer.gender || "",
      customer.address || "",
      customer.suburb || "",
      customer.city || "",
      customer.state || "",
      customer.postalCode || "",
      customer.country || "",
      customer.totalSpent.toString(),
      customer.visitCount.toString(),
      customer.loyaltyPoints.toString(),
      customer.marketingConsent ? "Yes" : "No",
      customer.source || "",
      customer.createdAt.toISOString(),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    return csvContent;
  }

  private buildOrderBy(
    sortBy: CustomerSortBy,
    sortOrder: "asc" | "desc",
  ): Prisma.CustomerOrderByWithRelationInput {
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

  private async parseCsvFile(
    buffer: Buffer,
    columnMappings?: Record<string, string>,
  ): Promise<any[]> {
    const { parse } = await import("csv-parse/sync");

    try {
      const records = parse(buffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
      });

      if (columnMappings && Object.keys(columnMappings).length > 0) {
        return records.map((record) => {
          const mappedRecord = { ...record };
          for (const [source, target] of Object.entries(columnMappings)) {
            if (source in record && target) {
              mappedRecord[target] = record[source];
            }
          }
          return mappedRecord;
        });
      }

      return records;
    } catch (error) {
      throw new BusinessRuleViolationException(
        "INVALID_FILE_FORMAT",
        "Invalid CSV file format",
      );
    }
  }

  private async parseCsvForMapping(buffer: Buffer) {
    const { parse } = await import("csv-parse/sync");

    try {
      const rows = parse(buffer, {
        columns: false,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
        to: 11,
      });

      if (!rows.length) {
        throw new BusinessRuleViolationException(
          "INVALID_FILE_FORMAT",
          "CSV file is empty",
        );
      }

      const [headers, ...previewRows] = rows;
      return {
        headers,
        rows: previewRows,
      };
    } catch (error) {
      throw new BusinessRuleViolationException(
        "INVALID_FILE_FORMAT",
        "Invalid CSV file format",
      );
    }
  }

  private parseCustomerImport(item: Record<string, any>) {
    const row = this.normalizeImportRow(item);

    const firstNameValue = this.getFirstFilledValue(row, [
      "firstname",
      "givenname",
      "given",
      "customerfirstname",
    ]);
    const lastNameValue = this.getFirstFilledValue(row, [
      "lastname",
      "surname",
      "familyname",
      "customerlastname",
    ]);
    const fullNameValue = this.getFirstFilledValue(row, [
      "fullname",
      "name",
      "customername",
      "clientname",
    ]);

    const { firstName, lastName } = this.resolveCustomerName(
      firstNameValue,
      lastNameValue,
      fullNameValue,
    );

    if (!firstName) {
      throw new Error("First Name is required");
    }

    const rawEmail = this.getFirstFilledValue(row, [
      "email",
      "emailaddress",
      "contactemail",
    ]);
    const email = rawEmail ? rawEmail.toLowerCase() : undefined;

    const rawMobile = this.getFirstFilledValue(row, [
      "mobilenumber",
      "mobile",
      "cell",
      "cellphone",
      "cellnumber",
      "mobilephone",
      "phonenumbermobile",
      "primaryphone",
      "contactnumber",
    ]);
    const rawPhone = this.getFirstFilledValue(row, [
      "phone",
      "phonenumber",
      "homephone",
      "landline",
      "workphone",
      "officephone",
    ]);

    const normalizedMobile = this.normalizePhoneNumber(rawMobile, "mobile");
    const normalizedPhone = this.normalizePhoneNumber(rawPhone, "phone");

    const mobile =
      normalizedMobile ??
      (normalizedPhone && this.isLikelyMobileNumber(normalizedPhone)
        ? normalizedPhone
        : undefined);
    const phone =
      normalizedPhone && normalizedPhone !== mobile
        ? normalizedPhone
        : undefined;

    const dateOfBirth = this.parseDateValue(
      this.getFirstFilledValue(row, ["dateofbirth", "dob", "birthdate"]),
    );

    const marketingConsent = this.parseBooleanValue(
      this.getFirstFilledValue(row, [
        "marketingconsent",
        "acceptsmarketing",
        "emailmarketing",
        "marketingoptin",
        "marketing",
      ]),
    );
    const smsConsent = this.parseBooleanValue(
      this.getFirstFilledValue(row, [
        "acceptssmsmarketing",
        "smsmarketing",
        "smsoptin",
        "smsconsent",
        "marketingoptinsms",
      ]),
    );

    const blocked = this.parseBooleanValue(
      this.getFirstFilledValue(row, ["blocked", "isblocked", "blacklisted"]),
    );
    const blockReason = this.getFirstFilledValue(row, [
      "blockreason",
      "blockedreason",
    ]);
    const legacyId = this.getFirstFilledValue(row, [
      "clientid",
      "customerid",
      "legacyid",
    ]);

    const addedDateRaw = this.getFirstFilledValue(row, ["added", "dateadded"]);
    const createdAtOverride = addedDateRaw
      ? this.parseDateValue(addedDateRaw)
      : undefined;
    const notes = this.buildNotes([
      this.getFirstFilledValue(row, ["note", "notes", "customernotes"]),
      blockReason ? `Block reason: ${blockReason}` : undefined,
      legacyId ? `Legacy ID: ${legacyId}` : undefined,
    ]);

    const source =
      this.getFirstFilledValue(row, ["source", "referralsource", "origin"]) ||
      "MIGRATED";

    const tagsValue = this.getFirstFilledValue(row, ["tags", "labels"]);
    const tags = tagsValue
      ? tagsValue
          .split(/[,;]/)
          .map((tag) => tag.trim())
          .filter(Boolean)
      : undefined;

    const preferredLanguage = this.getFirstFilledValue(row, [
      "preferredlanguage",
      "language",
    ]);

    const gender = this.getFirstFilledValue(row, ["gender", "sex"]);
    const address = this.getFirstFilledValue(row, [
      "address",
      "street",
      "streetaddress",
    ]);
    const suburb = this.getFirstFilledValue(row, ["suburb", "district"]);
    const city =
      this.getFirstFilledValue(row, ["city", "town"]) ?? suburb ?? undefined;
    const state = this.getFirstFilledValue(row, [
      "state",
      "stateprovince",
      "province",
    ]);
    const postalCode = this.getFirstFilledValue(row, [
      "postalcode",
      "postcode",
      "zipcode",
      "zip",
    ]);
    const country = this.getFirstFilledValue(row, ["country", "countrycode"]);

    const notificationPreference = this.resolveNotificationPreference(
      marketingConsent,
      smsConsent,
    );

    return {
      email,
      firstName,
      lastName: lastName ?? undefined,
      phone,
      mobile,
      dateOfBirth,
      gender: gender ?? undefined,
      address: address ?? undefined,
      suburb: suburb ?? undefined,
      city: city ?? undefined,
      state: state ?? undefined,
      postalCode: postalCode ?? undefined,
      country: country ?? undefined,
      notes: notes ?? undefined,
      marketingConsent: marketingConsent ?? undefined,
      emailNotifications: marketingConsent ?? undefined,
      smsNotifications: smsConsent ?? undefined,
      notificationPreference: notificationPreference ?? undefined,
      source,
      tags: tags ?? undefined,
      preferredLanguage: preferredLanguage ?? undefined,
      status:
        blocked === undefined ? undefined : blocked ? "INACTIVE" : "ACTIVE",
      createdAtOverride,
    };
  }

  private normalizeImportRow(item: Record<string, any>): Map<string, string> {
    const normalized = new Map<string, string>();
    for (const [key, rawValue] of Object.entries(item || {})) {
      if (!key) {
        continue;
      }
      const normalizedKey = this.normalizeFieldKey(key);
      if (!normalizedKey) {
        continue;
      }
      const value =
        rawValue === null || rawValue === undefined
          ? ""
          : String(rawValue).trim();
      if (value !== "" || !normalized.has(normalizedKey)) {
        normalized.set(normalizedKey, value);
      }
    }
    return normalized;
  }

  private normalizeFieldKey(key: string): string {
    return key
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  }

  private getFirstFilledValue(
    row: Map<string, string>,
    aliases: string[],
  ): string | undefined {
    for (const alias of aliases) {
      const normalizedAlias = this.normalizeFieldKey(alias);
      const value = row.get(normalizedAlias);
      if (value && value.trim().length > 0) {
        return value.trim();
      }
    }
    return undefined;
  }

  private resolveCustomerName(
    firstName?: string,
    lastName?: string,
    fullName?: string,
  ): { firstName?: string; lastName?: string } {
    let resolvedFirstName = firstName?.trim();
    let resolvedLastName = lastName?.trim();

    if ((!resolvedFirstName || !resolvedLastName) && fullName) {
      const cleanedFull = fullName.trim();
      if (cleanedFull.includes(",")) {
        const [lastPart, firstPart] = cleanedFull
          .split(",")
          .map((part) => part.trim())
          .filter(Boolean);
        resolvedFirstName = resolvedFirstName || firstPart || lastPart;
        resolvedLastName =
          resolvedLastName || (firstPart && lastPart ? lastPart : undefined);
      } else {
        const parts = cleanedFull.split(/\s+/);
        if (!resolvedFirstName && parts.length > 0) {
          resolvedFirstName = parts[0];
        }
        if (!resolvedLastName && parts.length > 1) {
          resolvedLastName = parts.slice(1).join(" ");
        }
      }
    }

    return {
      firstName: resolvedFirstName,
      lastName: resolvedLastName,
    };
  }

  private parseBooleanValue(value?: string): boolean | undefined {
    if (!value) {
      return undefined;
    }
    const normalized = value.trim().toLowerCase();
    if (["yes", "y", "true", "1", "accept", "accepted"].includes(normalized)) {
      return true;
    }
    if (["no", "n", "false", "0", "decline", "declined"].includes(normalized)) {
      return false;
    }
    return undefined;
  }

  private parseDateValue(value?: string): Date | undefined {
    if (!value) {
      return undefined;
    }
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }

    const direct = Date.parse(trimmed);
    if (!Number.isNaN(direct)) {
      return new Date(direct);
    }

    const parts = trimmed.match(/^(\d{1,4})[\/\-](\d{1,2})[\/\-](\d{1,4})$/);
    if (parts) {
      const [, first, second, third] = parts;
      let year: number;
      let month: number;
      let day: number;

      if (first.length === 4) {
        year = Number(first);
        month = Number(second);
        day = Number(third);
      } else if (third.length === 4) {
        year = Number(third);
        // Assume Australian format DD/MM/YYYY
        day = Number(first);
        month = Number(second);
      } else {
        year = Number(third.length === 2 ? `20${third}` : third);
        day = Number(second);
        month = Number(first);
      }

      if (!Number.isNaN(year) && !Number.isNaN(month) && !Number.isNaN(day)) {
        const parsed = new Date(Date.UTC(year, month - 1, day));
        if (!Number.isNaN(parsed.getTime())) {
          return parsed;
        }
      }
    }

    return undefined;
  }

  private normalizePhoneNumber(
    value?: string,
    type: "mobile" | "phone" = "mobile",
  ): string | undefined {
    if (!value) {
      return undefined;
    }

    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }

    let digits = trimmed.replace(/\D+/g, "");
    if (digits.length < 8) {
      return trimmed;
    }

    if (digits.startsWith("0011")) {
      digits = digits.slice(4);
    } else if (digits.startsWith("011")) {
      digits = digits.slice(3);
    } else if (digits.startsWith("00")) {
      digits = digits.slice(2);
    }

    if (digits.startsWith("61")) {
      const local = digits.slice(2);
      if (local.length >= 8 && local.length <= 10) {
        return `+61${local}`;
      }
    }

    if (digits.startsWith("0") && digits.length >= 9) {
      const local = digits.slice(1);
      if (local.length >= 8 && local.length <= 9) {
        return `+61${local}`;
      }
    }

    if (digits.length === 9) {
      if (type === "mobile" && digits[0] !== "4") {
        // Fall through and treat as a landline if it doesn't look like a mobile
      } else {
        return `+61${digits}`;
      }
    }

    if (trimmed.startsWith("+")) {
      return `+${digits}`;
    }

    if (digits.startsWith("61") && digits.length === 11) {
      return `+${digits}`;
    }

    if (digits.length >= 9 && digits.length <= 11) {
      return `+61${digits}`;
    }

    return trimmed;
  }

  private isLikelyMobileNumber(phone: string | undefined): boolean {
    if (!phone) {
      return false;
    }
    const digits = phone.replace(/\D+/g, "");
    if (digits.startsWith("04") && digits.length === 10) {
      return true;
    }
    if (digits.startsWith("614") && digits.length === 11) {
      return true;
    }
    if (digits.startsWith("61") && digits.length === 11 && digits[2] === "4") {
      return true;
    }
    if (digits.startsWith("4") && digits.length === 9) {
      return true;
    }
    return false;
  }

  private resolveNotificationPreference(
    emailConsent?: boolean,
    smsConsent?: boolean,
  ): string | undefined {
    if (emailConsent === undefined && smsConsent === undefined) {
      return undefined;
    }
    if (emailConsent && smsConsent) {
      return "both";
    }
    if (emailConsent) {
      return "email";
    }
    if (smsConsent) {
      return "sms";
    }
    return "none";
  }

  private buildNotes(parts: (string | undefined)[]): string | undefined {
    const filtered = parts.filter(
      (part): part is string => !!(part && part.trim()),
    );
    if (filtered.length === 0) {
      return undefined;
    }
    return filtered.join(" | ");
  }

  private prepareCustomerDataForPersistence(data: CustomerImportData) {
    const cleaned: Record<string, any> = {};

    for (const [key, value] of Object.entries(data)) {
      if (value === undefined || value === null || value === "") {
        continue;
      }

      if (value instanceof Date) {
        if (!Number.isNaN(value.getTime())) {
          cleaned[key] = value;
        }
        continue;
      }

      if (Array.isArray(value)) {
        cleaned[key] = value;
        continue;
      }

      if (typeof value === "string") {
        const trimmed = value.trim();
        if (trimmed.length === 0) {
          continue;
        }
        cleaned[key] = trimmed;
        continue;
      }

      cleaned[key] = value;
    }

    return cleaned;
  }

  private async findOrCreateWalkInCustomer(merchantId: string) {
    // First, try to find existing walk-in customer for this merchant
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { subdomain: true },
    });

    const walkInEmail = `walkin@${merchant?.subdomain || "unknown"}.local`;

    // Try to find existing walk-in customer
    let walkInCustomer = await this.prisma.customer.findFirst({
      where: {
        merchantId,
        OR: [
          { email: walkInEmail },
          {
            firstName: "Walk-in",
            lastName: "Customer",
            source: "WALK_IN",
          },
        ],
      },
    });

    // If not found, create new walk-in customer
    if (!walkInCustomer) {
      walkInCustomer = await this.prisma.customer.create({
        data: {
          merchantId,
          firstName: "Walk-in",
          lastName: "Customer",
          email: walkInEmail,
          source: "WALK_IN",
          status: "ACTIVE",
          marketingConsent: false,
          preferredLanguage: "en",
          loyaltyPoints: 0,
          visitCount: 0,
          totalSpent: 0,
          tags: [],
        },
      });
    }

    return walkInCustomer;
  }
}
