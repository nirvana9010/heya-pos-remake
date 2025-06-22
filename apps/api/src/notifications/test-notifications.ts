import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { NotificationsService } from './notifications.service';
import { NotificationType } from './interfaces/notification.interface';

async function testNotifications() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const notificationsService = app.get(NotificationsService);

  console.log('Testing notification system...\n');

  // Test context
  const testContext = {
    booking: {
      id: 'test-123',
      bookingNumber: 'BK-2025-001',
      date: new Date('2025-06-24T10:00:00'),
      time: '10:00 AM',
      serviceName: 'Haircut & Style',
      staffName: 'Jane Smith',
      duration: 60,
      price: 75,
      locationName: 'Hamilton Beauty Salon',
      locationAddress: '123 Main St, Sydney NSW 2000',
      locationPhone: '02 9876 5432',
    },
    merchant: {
      id: 'merchant-123',
      name: 'Hamilton Beauty',
      email: 'contact@hamiltonbeauty.com',
      phone: '02 9876 5432',
      website: 'https://hamiltonbeauty.com',
    },
    customer: {
      id: 'customer-123',
      email: 'test@example.com',
      phone: '+61412345678',
      firstName: 'Test',
      lastName: 'Customer',
      preferredChannel: 'both' as const,
    },
  };

  // Test booking confirmation
  console.log('1. Testing booking confirmation...');
  const confirmationResult = await notificationsService.sendNotification(
    NotificationType.BOOKING_CONFIRMATION,
    testContext,
  );
  console.log('Booking confirmation result:', confirmationResult);
  console.log();

  // Test 24h reminder
  console.log('2. Testing 24h reminder...');
  const reminder24hResult = await notificationsService.sendNotification(
    NotificationType.BOOKING_REMINDER_24H,
    testContext,
  );
  console.log('24h reminder result:', reminder24hResult);
  console.log();

  // Test cancellation
  console.log('3. Testing booking cancellation...');
  const cancellationResult = await notificationsService.sendNotification(
    NotificationType.BOOKING_CANCELLED,
    testContext,
  );
  console.log('Cancellation result:', cancellationResult);
  console.log();

  // Test notification history
  console.log('4. Testing notification history...');
  const history = await notificationsService.getNotificationHistory({
    customerId: 'customer-123',
  });
  console.log(`Found ${history.length} notifications in history`);
  
  await app.close();
  console.log('\nTest complete!');
}

// Run the test
testNotifications().catch((error) => {
  console.error('Test failed:', error);
  process.exit(1);
});