import { NotificationEventHandler } from './notification-event.handler';
import { NotificationType } from '../interfaces/notification.interface';

describe('NotificationEventHandler - booking.customer_changed', () => {
  let handler: NotificationEventHandler;
  let notificationsService: { sendNotification: jest.Mock };
  let merchantNotificationsService: { createBookingNotification: jest.Mock };
  let prisma: any;

  const createBooking = (overrides: Partial<any> = {}) => {
    const now = new Date('2024-05-20T10:00:00.000Z');
    return {
      id: 'booking-1',
      bookingNumber: 'B-100',
      status: 'CONFIRMED',
      startTime: now,
      totalAmount: 120,
      merchantId: 'merchant-1',
      customerId: 'customer-2',
      customer: {
        id: 'customer-2',
        firstName: 'New',
        lastName: 'Customer',
        email: 'new@example.com',
        phone: '0400000000',
        notificationPreference: 'both',
      },
      merchant: {
        id: 'merchant-1',
        name: 'Merchant',
        email: 'merchant@example.com',
        phone: '0299998888',
        website: 'https://merchant.example.com',
        settings: {},
        locations: [
          {
            address: '123 Street',
            suburb: 'Sydney',
            state: 'NSW',
            postalCode: '2000',
          },
        ],
      },
      provider: null,
      services: [
        {
          service: {
            name: 'Haircut',
          },
          staff: {
            firstName: 'Sam',
            lastName: 'Stylist',
          },
          duration: 60,
        },
      ],
      location: {
        name: 'Main Salon',
        address: '123 Street',
        phone: '0299997777',
      },
      ...overrides,
    };
  };

  beforeEach(() => {
    notificationsService = {
      sendNotification: jest.fn().mockResolvedValue({
        email: { success: true },
        sms: { success: true },
      }),
    };

    merchantNotificationsService = {
      createBookingNotification: jest.fn().mockResolvedValue(undefined),
    };

    prisma = {
      booking: {
        findUnique: jest.fn(),
      },
      customer: {
        findUnique: jest.fn(),
      },
    };

    handler = new NotificationEventHandler(
      notificationsService as any,
      merchantNotificationsService as any,
      prisma,
    );
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('resends confirmation and informs merchant when booking is confirmed', async () => {
    prisma.booking.findUnique.mockResolvedValue(createBooking());
    prisma.customer.findUnique.mockResolvedValue({
      firstName: 'Old',
      lastName: 'Customer',
      email: 'old@example.com',
      phone: '0411111111',
    });

    await handler.handleBookingCustomerChanged({
      bookingId: 'booking-1',
      previousCustomerId: 'customer-1',
      newCustomerId: 'customer-2',
    });

    expect(merchantNotificationsService.createBookingNotification).toHaveBeenCalledWith(
      'merchant-1',
      'booking_modified',
      expect.objectContaining({ id: 'booking-1', customerName: 'New Customer' }),
      expect.stringContaining('changed customer'),
    );

    expect(notificationsService.sendNotification).toHaveBeenCalledWith(
      NotificationType.BOOKING_CONFIRMATION,
      expect.objectContaining({
        customer: expect.objectContaining({ id: 'customer-2' }),
      }),
    );
  });

  it('skips confirmation when booking is not confirmed', async () => {
    prisma.booking.findUnique.mockResolvedValue(createBooking({ status: 'PENDING' }));
    prisma.customer.findUnique.mockResolvedValue({
      firstName: 'Old',
      lastName: 'Customer',
      email: 'old@example.com',
      phone: '0411111111',
    });

    await handler.handleBookingCustomerChanged({
      bookingId: 'booking-1',
      previousCustomerId: 'customer-1',
      newCustomerId: 'customer-2',
    });

    expect(merchantNotificationsService.createBookingNotification).toHaveBeenCalled();
    expect(notificationsService.sendNotification).not.toHaveBeenCalled();
  });
});
