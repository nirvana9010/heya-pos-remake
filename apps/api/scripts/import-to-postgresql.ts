import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Prisma with pooled connection
// Note: Using pooled connection since direct might be IP-restricted
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

// Helper function to convert cuid to uuid format (if needed)
function convertId(id: string): string {
  // If you want to maintain the same IDs, return as-is
  // Otherwise, you could generate new UUIDs here
  return id;
}

// Helper to parse decimal fields
function parseDecimal(value: any): string | null {
  if (value === null || value === undefined) return null;
  return value.toString();
}

// Helper to ensure JSON fields are properly formatted
function ensureJson(value: any): any {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

async function importData() {
  console.log('Starting PostgreSQL data import...');
  
  const dataDir = path.join(__dirname, '../data-export');
  
  try {
    // Read metadata
    const metadata = JSON.parse(fs.readFileSync(path.join(dataDir, 'metadata.json'), 'utf-8'));
    console.log('Import metadata:', metadata);

    // Clear existing data one by one (transaction pooling doesn't support large transactions)
    console.log('Clearing existing data...');
    
    // Delete in reverse dependency order
    await prisma.auditLog.deleteMany();
    await prisma.loyaltyTransaction.deleteMany();
    await prisma.loyaltyCard.deleteMany();
    await prisma.loyaltyTier.deleteMany();
    await prisma.loyaltyProgram.deleteMany();
    await prisma.paymentRefund.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.invoiceItem.deleteMany();
    await prisma.invoice.deleteMany();
    await prisma.bookingService.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.service.deleteMany();
    await prisma.serviceCategory.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.staffLocation.deleteMany();
    await prisma.staff.deleteMany();
    await prisma.location.deleteMany();
    await prisma.merchantAuth.deleteMany();
    await prisma.merchant.deleteMany();
    await prisma.package.deleteMany();

    // Import in dependency order
    
    // 1. Package
    console.log('Importing Package...');
    const packages = JSON.parse(fs.readFileSync(path.join(dataDir, 'Package.json'), 'utf-8'));
    for (const pkg of packages) {
      await prisma.package.create({
        data: {
          id: convertId(pkg.id),
          name: pkg.name,
          monthlyPrice: parseDecimal(pkg.monthlyPrice),
          trialDays: pkg.trialDays,
          maxLocations: pkg.maxLocations,
          maxStaff: pkg.maxStaff,
          maxCustomers: pkg.maxCustomers,
          features: ensureJson(pkg.features),
          createdAt: new Date(pkg.createdAt),
          updatedAt: new Date(pkg.updatedAt),
        }
      });
    }
    console.log(`Imported ${packages.length} packages`);

    // 2. Merchant
    console.log('Importing Merchant...');
    const merchants = JSON.parse(fs.readFileSync(path.join(dataDir, 'Merchant.json'), 'utf-8'));
    for (const merchant of merchants) {
      await prisma.merchant.create({
        data: {
          id: convertId(merchant.id),
          name: merchant.name,
          email: merchant.email,
          phone: merchant.phone,
          abn: merchant.abn,
          subdomain: merchant.subdomain,
          packageId: convertId(merchant.packageId),
          subscriptionStatus: merchant.subscriptionStatus,
          subscriptionEnds: merchant.subscriptionEnds ? new Date(merchant.subscriptionEnds) : null,
          trialEndsAt: merchant.trialEndsAt ? new Date(merchant.trialEndsAt) : null,
          stripeCustomerId: merchant.stripeCustomerId,
          website: merchant.website,
          logo: merchant.logo,
          description: merchant.description,
          status: merchant.status,
          settings: ensureJson(merchant.settings),
          createdAt: new Date(merchant.createdAt),
          updatedAt: new Date(merchant.updatedAt),
        }
      });
    }
    console.log(`Imported ${merchants.length} merchants`);

    // 3. MerchantAuth
    console.log('Importing MerchantAuth...');
    const merchantAuths = JSON.parse(fs.readFileSync(path.join(dataDir, 'MerchantAuth.json'), 'utf-8'));
    for (const auth of merchantAuths) {
      await prisma.merchantAuth.create({
        data: {
          id: convertId(auth.id),
          merchantId: convertId(auth.merchantId),
          username: auth.username,
          passwordHash: auth.passwordHash,
          lastLoginAt: auth.lastLoginAt ? new Date(auth.lastLoginAt) : null,
          createdAt: new Date(auth.createdAt),
          updatedAt: new Date(auth.updatedAt),
        }
      });
    }
    console.log(`Imported ${merchantAuths.length} merchant auths`);

    // 4. Location
    console.log('Importing Location...');
    const locations = JSON.parse(fs.readFileSync(path.join(dataDir, 'Location.json'), 'utf-8'));
    for (const location of locations) {
      await prisma.location.create({
        data: {
          id: convertId(location.id),
          merchantId: convertId(location.merchantId),
          name: location.name,
          address: location.address,
          suburb: location.suburb,
          city: location.city,
          state: location.state,
          country: location.country,
          postalCode: location.postalCode,
          phone: location.phone,
          email: location.email,
          timezone: location.timezone,
          businessHours: ensureJson(location.businessHours),
          isActive: location.isActive,
          settings: ensureJson(location.settings),
          createdAt: new Date(location.createdAt),
          updatedAt: new Date(location.updatedAt),
        }
      });
    }
    console.log(`Imported ${locations.length} locations`);

    // 5. Staff
    console.log('Importing Staff...');
    const staff = JSON.parse(fs.readFileSync(path.join(dataDir, 'Staff.json'), 'utf-8'));
    for (const member of staff) {
      await prisma.staff.create({
        data: {
          id: convertId(member.id),
          merchantId: convertId(member.merchantId),
          email: member.email,
          firstName: member.firstName,
          lastName: member.lastName,
          phone: member.phone,
          pin: member.pin,
          accessLevel: member.accessLevel,
          calendarColor: member.calendarColor,
          avatar: member.avatar,
          status: member.status,
          hireDate: new Date(member.hireDate),
          lastLogin: member.lastLogin ? new Date(member.lastLogin) : null,
          createdAt: new Date(member.createdAt),
          updatedAt: new Date(member.updatedAt),
        }
      });
    }
    console.log(`Imported ${staff.length} staff members`);

    // 6. StaffLocation
    console.log('Importing StaffLocation...');
    const staffLocations = JSON.parse(fs.readFileSync(path.join(dataDir, 'StaffLocation.json'), 'utf-8'));
    for (const sl of staffLocations) {
      await prisma.staffLocation.create({
        data: {
          id: convertId(sl.id),
          staffId: convertId(sl.staffId),
          locationId: convertId(sl.locationId),
          isPrimary: sl.isPrimary,
          createdAt: new Date(sl.createdAt),
        }
      });
    }
    console.log(`Imported ${staffLocations.length} staff locations`);

    // 7. Customer
    console.log('Importing Customer...');
    const customers = JSON.parse(fs.readFileSync(path.join(dataDir, 'Customer.json'), 'utf-8'));
    for (const customer of customers) {
      await prisma.customer.create({
        data: {
          id: convertId(customer.id),
          merchantId: convertId(customer.merchantId),
          email: customer.email,
          firstName: customer.firstName,
          lastName: customer.lastName,
          phone: customer.phone,
          mobile: customer.mobile,
          dateOfBirth: customer.dateOfBirth ? new Date(customer.dateOfBirth) : null,
          gender: customer.gender,
          address: customer.address,
          suburb: customer.suburb,
          city: customer.city,
          state: customer.state,
          country: customer.country,
          postalCode: customer.postalCode,
          notes: customer.notes,
          tags: ensureJson(customer.tags),
          preferredLanguage: customer.preferredLanguage,
          marketingConsent: customer.marketingConsent,
          status: customer.status,
          source: customer.source,
          loyaltyPoints: parseDecimal(customer.loyaltyPoints),
          visitCount: customer.visitCount,
          totalSpent: parseDecimal(customer.totalSpent),
          loyaltyVisits: customer.loyaltyVisits,
          lifetimeVisits: customer.lifetimeVisits,
          createdAt: new Date(customer.createdAt),
          updatedAt: new Date(customer.updatedAt),
        }
      });
    }
    console.log(`Imported ${customers.length} customers`);

    // 8. ServiceCategory
    console.log('Importing ServiceCategory...');
    const categories = JSON.parse(fs.readFileSync(path.join(dataDir, 'ServiceCategory.json'), 'utf-8'));
    for (const category of categories) {
      await prisma.serviceCategory.create({
        data: {
          id: convertId(category.id),
          merchantId: convertId(category.merchantId),
          name: category.name,
          description: category.description,
          icon: category.icon,
          color: category.color,
          sortOrder: category.sortOrder,
          isActive: category.isActive,
          createdAt: new Date(category.createdAt),
          updatedAt: new Date(category.updatedAt),
        }
      });
    }
    console.log(`Imported ${categories.length} service categories`);

    // 9. Service
    console.log('Importing Service...');
    const services = JSON.parse(fs.readFileSync(path.join(dataDir, 'Service.json'), 'utf-8'));
    for (const service of services) {
      await prisma.service.create({
        data: {
          id: convertId(service.id),
          merchantId: convertId(service.merchantId),
          categoryId: service.categoryId ? convertId(service.categoryId) : null,
          name: service.name,
          description: service.description,
          category: service.category,
          duration: service.duration,
          price: parseDecimal(service.price),
          currency: service.currency,
          taxRate: parseDecimal(service.taxRate),
          isActive: service.isActive,
          requiresDeposit: service.requiresDeposit,
          depositAmount: service.depositAmount ? parseDecimal(service.depositAmount) : null,
          maxAdvanceBooking: service.maxAdvanceBooking,
          minAdvanceBooking: service.minAdvanceBooking,
          displayOrder: service.displayOrder,
          createdAt: new Date(service.createdAt),
          updatedAt: new Date(service.updatedAt),
        }
      });
    }
    console.log(`Imported ${services.length} services`);

    // 10. Booking
    console.log('Importing Booking...');
    const bookings = JSON.parse(fs.readFileSync(path.join(dataDir, 'Booking.json'), 'utf-8'));
    for (const booking of bookings) {
      await prisma.booking.create({
        data: {
          id: convertId(booking.id),
          merchantId: convertId(booking.merchantId),
          locationId: convertId(booking.locationId),
          customerId: convertId(booking.customerId),
          bookingNumber: booking.bookingNumber,
          status: booking.status,
          startTime: new Date(booking.startTime),
          endTime: new Date(booking.endTime),
          totalAmount: parseDecimal(booking.totalAmount),
          depositAmount: parseDecimal(booking.depositAmount),
          notes: booking.notes,
          cancellationReason: booking.cancellationReason,
          source: booking.source,
          createdById: convertId(booking.createdById),
          providerId: convertId(booking.providerId),
          reminderSent: booking.reminderSent,
          confirmedAt: booking.confirmedAt ? new Date(booking.confirmedAt) : null,
          checkedInAt: booking.checkedInAt ? new Date(booking.checkedInAt) : null,
          completedAt: booking.completedAt ? new Date(booking.completedAt) : null,
          cancelledAt: booking.cancelledAt ? new Date(booking.cancelledAt) : null,
          createdAt: new Date(booking.createdAt),
          updatedAt: new Date(booking.updatedAt),
        }
      });
    }
    console.log(`Imported ${bookings.length} bookings`);

    // 11. BookingService
    console.log('Importing BookingService...');
    const bookingServices = JSON.parse(fs.readFileSync(path.join(dataDir, 'BookingService.json'), 'utf-8'));
    for (const bs of bookingServices) {
      await prisma.bookingService.create({
        data: {
          id: convertId(bs.id),
          bookingId: convertId(bs.bookingId),
          serviceId: convertId(bs.serviceId),
          price: parseDecimal(bs.price),
          duration: bs.duration,
          staffId: convertId(bs.staffId),
          createdAt: new Date(bs.createdAt),
        }
      });
    }
    console.log(`Imported ${bookingServices.length} booking services`);

    // 12. Invoice
    console.log('Importing Invoice...');
    const invoices = JSON.parse(fs.readFileSync(path.join(dataDir, 'Invoice.json'), 'utf-8'));
    for (const invoice of invoices) {
      await prisma.invoice.create({
        data: {
          id: convertId(invoice.id),
          merchantId: convertId(invoice.merchantId),
          customerId: convertId(invoice.customerId),
          bookingId: invoice.bookingId ? convertId(invoice.bookingId) : null,
          invoiceNumber: invoice.invoiceNumber,
          status: invoice.status,
          subtotal: parseDecimal(invoice.subtotal),
          taxAmount: parseDecimal(invoice.taxAmount),
          discountAmount: parseDecimal(invoice.discountAmount),
          totalAmount: parseDecimal(invoice.totalAmount),
          paidAmount: parseDecimal(invoice.paidAmount),
          dueDate: new Date(invoice.dueDate),
          notes: invoice.notes,
          terms: invoice.terms,
          createdById: convertId(invoice.createdById),
          sentAt: invoice.sentAt ? new Date(invoice.sentAt) : null,
          paidAt: invoice.paidAt ? new Date(invoice.paidAt) : null,
          voidedAt: invoice.voidedAt ? new Date(invoice.voidedAt) : null,
          createdAt: new Date(invoice.createdAt),
          updatedAt: new Date(invoice.updatedAt),
        }
      });
    }
    console.log(`Imported ${invoices.length} invoices`);

    // 13. InvoiceItem
    console.log('Importing InvoiceItem...');
    const invoiceItems = JSON.parse(fs.readFileSync(path.join(dataDir, 'InvoiceItem.json'), 'utf-8'));
    for (const item of invoiceItems) {
      await prisma.invoiceItem.create({
        data: {
          id: convertId(item.id),
          invoiceId: convertId(item.invoiceId),
          description: item.description,
          quantity: parseDecimal(item.quantity),
          unitPrice: parseDecimal(item.unitPrice),
          discount: parseDecimal(item.discount),
          taxRate: parseDecimal(item.taxRate),
          taxAmount: parseDecimal(item.taxAmount),
          total: parseDecimal(item.total),
          sortOrder: item.sortOrder,
          createdAt: new Date(item.createdAt),
          updatedAt: new Date(item.updatedAt),
        }
      });
    }
    console.log(`Imported ${invoiceItems.length} invoice items`);

    // 14. Payment
    console.log('Importing Payment...');
    const payments = JSON.parse(fs.readFileSync(path.join(dataDir, 'Payment.json'), 'utf-8'));
    for (const payment of payments) {
      await prisma.payment.create({
        data: {
          id: convertId(payment.id),
          merchantId: convertId(payment.merchantId),
          locationId: convertId(payment.locationId),
          invoiceId: convertId(payment.invoiceId),
          paymentMethod: payment.paymentMethod,
          amount: parseDecimal(payment.amount),
          currency: payment.currency,
          status: payment.status,
          reference: payment.reference,
          stripePaymentIntentId: payment.stripePaymentIntentId,
          tyroTransactionId: payment.tyroTransactionId,
          processorResponse: payment.processorResponse ? ensureJson(payment.processorResponse) : null,
          notes: payment.notes,
          processedAt: payment.processedAt ? new Date(payment.processedAt) : null,
          failedAt: payment.failedAt ? new Date(payment.failedAt) : null,
          refundedAmount: parseDecimal(payment.refundedAmount),
          createdAt: new Date(payment.createdAt),
          updatedAt: new Date(payment.updatedAt),
        }
      });
    }
    console.log(`Imported ${payments.length} payments`);

    // 15. PaymentRefund (if any)
    console.log('Importing PaymentRefund...');
    const refunds = JSON.parse(fs.readFileSync(path.join(dataDir, 'PaymentRefund.json'), 'utf-8'));
    for (const refund of refunds) {
      await prisma.paymentRefund.create({
        data: {
          id: convertId(refund.id),
          paymentId: convertId(refund.paymentId),
          amount: parseDecimal(refund.amount),
          reason: refund.reason,
          status: refund.status,
          reference: refund.reference,
          processedAt: refund.processedAt ? new Date(refund.processedAt) : null,
          createdAt: new Date(refund.createdAt),
          updatedAt: new Date(refund.updatedAt),
        }
      });
    }
    console.log(`Imported ${refunds.length} payment refunds`);

    // 16. LoyaltyProgram
    console.log('Importing LoyaltyProgram...');
    const programs = JSON.parse(fs.readFileSync(path.join(dataDir, 'LoyaltyProgram.json'), 'utf-8'));
    for (const program of programs) {
      await prisma.loyaltyProgram.create({
        data: {
          id: convertId(program.id),
          merchantId: convertId(program.merchantId),
          name: program.name,
          description: program.description,
          type: program.type,
          visitsRequired: program.visitsRequired,
          visitRewardType: program.visitRewardType,
          visitRewardValue: program.visitRewardValue ? parseDecimal(program.visitRewardValue) : null,
          pointsPerVisit: program.pointsPerVisit ? parseDecimal(program.pointsPerVisit) : null,
          pointsPerDollar: program.pointsPerDollar ? parseDecimal(program.pointsPerDollar) : null,
          pointsPerCurrency: parseDecimal(program.pointsPerCurrency),
          rewardThreshold: parseDecimal(program.rewardThreshold),
          rewardValue: parseDecimal(program.rewardValue),
          pointsValue: parseDecimal(program.pointsValue),
          expiryDays: program.expiryDays,
          isActive: program.isActive,
          terms: program.terms,
          createdAt: new Date(program.createdAt),
          updatedAt: new Date(program.updatedAt),
        }
      });
    }
    console.log(`Imported ${programs.length} loyalty programs`);

    // 17. LoyaltyTier
    console.log('Importing LoyaltyTier...');
    const tiers = JSON.parse(fs.readFileSync(path.join(dataDir, 'LoyaltyTier.json'), 'utf-8'));
    for (const tier of tiers) {
      await prisma.loyaltyTier.create({
        data: {
          id: convertId(tier.id),
          programId: convertId(tier.programId),
          name: tier.name,
          requiredPoints: parseDecimal(tier.requiredPoints),
          multiplier: parseDecimal(tier.multiplier),
          benefits: ensureJson(tier.benefits),
          sortOrder: tier.sortOrder,
          createdAt: new Date(tier.createdAt),
          updatedAt: new Date(tier.updatedAt),
        }
      });
    }
    console.log(`Imported ${tiers.length} loyalty tiers`);

    // 18. LoyaltyCard
    console.log('Importing LoyaltyCard...');
    const cards = JSON.parse(fs.readFileSync(path.join(dataDir, 'LoyaltyCard.json'), 'utf-8'));
    for (const card of cards) {
      await prisma.loyaltyCard.create({
        data: {
          id: convertId(card.id),
          programId: convertId(card.programId),
          customerId: convertId(card.customerId),
          tierId: card.tierId ? convertId(card.tierId) : null,
          cardNumber: card.cardNumber,
          points: parseDecimal(card.points),
          lifetimePoints: parseDecimal(card.lifetimePoints),
          status: card.status,
          joinedAt: new Date(card.joinedAt),
          lastActivityAt: new Date(card.lastActivityAt),
          expiresAt: card.expiresAt ? new Date(card.expiresAt) : null,
          createdAt: new Date(card.createdAt),
          updatedAt: new Date(card.updatedAt),
        }
      });
    }
    console.log(`Imported ${cards.length} loyalty cards`);

    // 19. LoyaltyTransaction
    console.log('Importing LoyaltyTransaction...');
    const transactions = JSON.parse(fs.readFileSync(path.join(dataDir, 'LoyaltyTransaction.json'), 'utf-8'));
    for (const transaction of transactions) {
      await prisma.loyaltyTransaction.create({
        data: {
          id: convertId(transaction.id),
          cardId: transaction.cardId ? convertId(transaction.cardId) : null,
          customerId: convertId(transaction.customerId),
          merchantId: convertId(transaction.merchantId),
          type: transaction.type,
          points: parseDecimal(transaction.points),
          visitsDelta: transaction.visitsDelta,
          balance: parseDecimal(transaction.balance),
          description: transaction.description,
          referenceType: transaction.referenceType,
          referenceId: transaction.referenceId,
          bookingId: transaction.bookingId ? convertId(transaction.bookingId) : null,
          expiresAt: transaction.expiresAt ? new Date(transaction.expiresAt) : null,
          createdByStaffId: transaction.createdByStaffId ? convertId(transaction.createdByStaffId) : null,
          createdAt: new Date(transaction.createdAt),
        }
      });
    }
    console.log(`Imported ${transactions.length} loyalty transactions`);

    // 20. AuditLog
    console.log('Importing AuditLog...');
    const auditLogs = JSON.parse(fs.readFileSync(path.join(dataDir, 'AuditLog.json'), 'utf-8'));
    for (const log of auditLogs) {
      await prisma.auditLog.create({
        data: {
          id: convertId(log.id),
          merchantId: convertId(log.merchantId),
          staffId: convertId(log.staffId),
          action: log.action,
          entityType: log.entityType,
          entityId: log.entityId,
          details: ensureJson(log.details),
          ipAddress: log.ipAddress,
          timestamp: new Date(log.timestamp),
        }
      });
    }
    console.log(`Imported ${auditLogs.length} audit logs`);

    console.log('\nImport complete!');

  } catch (error) {
    console.error('Import failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import
importData().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});