import 'dotenv/config';
import { randomUUID } from 'crypto';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { BookingCreationService } from '../src/contexts/bookings/application/services/booking-creation.service';
import { OutboxPublisherService } from '../src/contexts/shared/outbox/application/outbox-publisher.service';
import { NotificationType } from '../src/notifications/interfaces/notification.interface';

function getArg(key: string): string | undefined {
  const eqKey = `${key}=`;
  for (let i = 2; i < process.argv.length; i += 1) {
    const arg = process.argv[i];
    if (arg === key && i + 1 < process.argv.length) {
      return process.argv[i + 1];
    }
    if (arg.startsWith(eqKey)) {
      return arg.slice(eqKey.length);
    }
  }
  return undefined;
}

async function main() {
  const merchantId = getArg('--merchant') || process.env.TRACE_MERCHANT_ID;
  if (!merchantId) {
    throw new Error('Merchant ID is required. Pass --merchant <id> or set TRACE_MERCHANT_ID.');
  }

  if (!process.env.SENDGRID_API_KEY) {
    throw new Error('SENDGRID_API_KEY must be set to run the trace against the real email provider.');
  }
  if (!process.env.SENDGRID_FROM_EMAIL) {
    throw new Error('SENDGRID_FROM_EMAIL must be set to run the trace against the real email provider.');
  }
  process.env.USE_MOCKS = 'false';

  const customerEmailArg = getArg('--customerEmail') || process.env.TRACE_CUSTOMER_EMAIL;
  const customerEmail = customerEmailArg || 'lukas.tn90@gmail.com';
  const startOffsetMinutes = Number(getArg('--startOffsetMinutes') || 90);

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn'],
  });

  const prisma = app.get(PrismaService);
  const bookingCreationService = app.get(BookingCreationService);
  const outboxPublisher = app.get(OutboxPublisherService);

  try {
    console.log('\n🔍 Fetching merchant information');
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
  });
    if (!merchant) {
      throw new Error(`Merchant ${merchantId} not found`);
    }

  const settings = merchant.settings ? { ...(merchant.settings as Record<string, any>) } : {};
    if (settings.autoConfirmBookings === false) {
      console.log('⚠️ autoConfirmBookings disabled; enabling for trace run');
    settings.autoConfirmBookings = true;
      await prisma.merchant.update({
        where: { id: merchantId },
        data: { settings },
      });
    }

  const [service, staff, location] = await Promise.all([
    prisma.service.findFirst({ where: { merchantId, isActive: true } }),
    prisma.staff.findFirst({ where: { merchantId, status: 'ACTIVE' } }),
    prisma.location.findFirst({ where: { merchantId, isActive: true } }),
  ]);

    if (!service || !staff || !location) {
      throw new Error(
        `Missing service/staff/location for merchant ${merchantId}. service=${!!service} staff=${!!staff} location=${!!location}`,
      );
    }

    console.log(`🧾 Using service ${service.name}, staff ${staff.firstName} ${staff.lastName || ''}, location ${location.name}`);

    const startTime = new Date(Date.now() + startOffsetMinutes * 60 * 1000);
    startTime.setSeconds(0, 0);

  let customer = await prisma.customer.findFirst({
    where: {
      merchantId,
      email: customerEmail,
    },
  });

  if (customer) {
    console.log(`👤 Reusing existing trace customer ${customer.email}`);
  } else {
    customer = await prisma.customer.create({
      data: {
        id: randomUUID(),
        merchantId,
        firstName: 'Trace',
        lastName: 'AutoConfirm',
        email: customerEmail,
        notificationPreference: 'both',
        emailNotifications: true,
        smsNotifications: false,
        source: 'TRACE_SCRIPT',
      },
    });
    console.log(`👤 Created trace customer ${customer.email}`);
  }

    console.log('📝 Creating auto-confirm booking (ONLINE)');
    const booking = await bookingCreationService.createBooking({
      merchantId,
      customerId: customer.id,
      startTime,
      services: [
        {
          serviceId: service.id,
          staffId: staff.id,
        },
      ],
      locationId: location.id,
      source: 'ONLINE',
      createdById: staff.id,
      isOverride: true,
      notes: '[trace-auto-confirm-email]',
    });

    console.log(`✅ Booking created: ${booking.bookingNumber} (${booking.id}) status=${booking.status.value}`);

    console.log('📬 Publishing outbox events');
    await outboxPublisher.publishUnprocessedEvents();

    console.log('⏳ Waiting for notification handlers...');
    await new Promise(resolve => setTimeout(resolve, 1500));

    const outboxEvents = await prisma.outboxEvent.findMany({
      where: { aggregateId: booking.id },
      orderBy: { createdAt: 'asc' },
    });

    console.log(`📦 Outbox events for booking ${booking.id}:`);
    outboxEvents.forEach(evt => {
      console.log(`  - ${evt.eventType} (processedAt=${evt.processedAt?.toISOString() ?? 'pending'})`);
      if (evt.lastError) {
        console.log(`    lastError: ${evt.lastError}`);
      }
    });

    const notificationLogs = await prisma.notificationLog.findMany({
      where: {
        bookingId: booking.id,
        type: NotificationType.BOOKING_CONFIRMATION,
      },
      orderBy: { sentAt: 'desc' },
    });

    if (notificationLogs.length === 0) {
      console.log('❌ No notification logs recorded for this booking.');
    } else {
      console.log(`🗂️ Notification logs (${notificationLogs.length} found):`);
      notificationLogs.forEach(log => {
        console.log(
          `  - ${log.channel} status=${log.status} sentAt=${log.sentAt.toISOString()} recipient=${log.recipient} error=${log.error ?? 'none'} messageId=${log.messageId ?? 'n/a'}`,
        );
      });
    }

    console.log('\n🎯 Trace complete');
    console.log(`   Customer email: ${customer.email}`);
    console.log(`   Booking id: ${booking.id}`);
  } finally {
    await app.close();
  }
}

main().catch(error => {
  console.error('Trace failed:', error);
  process.exit(1);
});
