import { BadRequestException } from '@nestjs/common';
import { BookingUpdateService } from './booking-update.service';
import { Booking } from '../../domain/entities/booking.entity';
import { TimeSlot } from '../../domain/value-objects/time-slot.vo';
import { BookingStatusValue } from '../../domain/value-objects/booking-status.vo';
import { PaymentStatusEnum } from '../../domain/value-objects/payment-status.vo';

const makeBooking = (overrides: Partial<ConstructorParameters<typeof Booking>[0]> = {}): Booking => {
  const start = new Date('2024-01-01T10:00:00.000Z');
  const end = new Date('2024-01-01T11:00:00.000Z');

  const base = {
    id: 'booking-1',
    bookingNumber: 'B-1',
    status: BookingStatusValue.CONFIRMED,
    timeSlot: new TimeSlot(start, end),
    customerId: 'customer-1',
    staffId: 'staff-1',
    serviceId: 'service-1',
    locationId: 'location-1',
    merchantId: 'merchant-1',
    notes: undefined,
    totalAmount: 100,
    depositAmount: 0,
    isOverride: false,
    overrideReason: undefined,
    source: 'INTERNAL',
    createdById: 'staff-1',
    customerRequestedStaff: false,
    createdAt: start,
    updatedAt: start,
    cancelledAt: undefined,
    cancellationReason: undefined,
    completedAt: undefined,
    paymentStatus: PaymentStatusEnum.UNPAID,
    paidAmount: 0,
    paymentMethod: undefined,
    paymentReference: undefined,
    paidAt: undefined,
  } as const;

  return new Booking({
    ...base,
    ...overrides,
  });
};

describe('BookingUpdateService - customer reassignment', () => {
  let prisma: any;
  let bookingRepository: any;
  let loyaltyService: any;
  let cacheService: any;
  let outboxRepository: any;
  let service: BookingUpdateService;

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn(),
    };
    bookingRepository = {
      findById: jest.fn(),
      lockStaff: jest.fn(),
      findConflictingBookings: jest.fn(),
      update: jest.fn(),
    };
    loyaltyService = {
      processBookingCompletion: jest.fn(),
    };
    cacheService = {
      deletePattern: jest.fn().mockResolvedValue(undefined),
    };
    outboxRepository = {
      save: jest.fn().mockResolvedValue(undefined),
    };

    service = new BookingUpdateService(
      prisma,
      bookingRepository,
      loyaltyService,
      cacheService,
      outboxRepository,
    );

  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('reassigns the customer and rewires linked order', async () => {
    const booking = makeBooking();
    const updatedBooking = makeBooking({ customerId: 'customer-2' });

    bookingRepository.findById.mockResolvedValue(booking);
    bookingRepository.update.mockResolvedValue(updatedBooking);

    const tx = {
      customer: {
        findFirst: jest.fn().mockResolvedValue({ id: 'customer-2' }),
      },
      order: {
        findFirst: jest.fn().mockResolvedValue({ id: 'order-1' }),
        update: jest.fn().mockResolvedValue(undefined),
      },
      booking: {
        update: jest.fn(),
        findUnique: jest.fn(),
      },
      bookingService: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      service: {
        findUnique: jest.fn(),
      },
      staff: {
        findUnique: jest.fn(),
      },
    };

    prisma.$transaction.mockImplementation(async (callback: any) => callback(tx));

    const result = await service.updateBooking({
      bookingId: 'booking-1',
      merchantId: 'merchant-1',
      customerId: 'customer-2',
    });

    expect(bookingRepository.findById).toHaveBeenCalledWith('booking-1', 'merchant-1');
    expect(tx.customer.findFirst).toHaveBeenCalledWith({
      where: { id: 'customer-2', merchantId: 'merchant-1' },
      select: { id: true },
    });
    expect(tx.order.update).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      data: { customerId: 'customer-2' },
    });
    expect(outboxRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'customer_changed' }),
      tx,
    );
    expect(result.customerId).toBe('customer-2');
    expect(cacheService.deletePattern).toHaveBeenCalledTimes(2);
  });

  it('rejects reassignment when payment has been recorded', async () => {
    const paidBooking = makeBooking({ paymentStatus: PaymentStatusEnum.PAID });
    bookingRepository.findById.mockResolvedValue(paidBooking);

    const tx = {
      customer: {
        findFirst: jest.fn().mockResolvedValue({ id: 'customer-2' }),
      },
      order: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      bookingService: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      booking: {
        update: jest.fn(),
        findUnique: jest.fn(),
      },
      service: {
        findUnique: jest.fn(),
      },
      staff: {
        findUnique: jest.fn(),
      },
    };

    prisma.$transaction.mockImplementation(async (callback: any) => callback(tx));

    await expect(
      service.updateBooking({
        bookingId: 'booking-1',
        merchantId: 'merchant-1',
        customerId: 'customer-2',
      }),
    ).rejects.toThrow(BadRequestException);

    expect(tx.order.update).not.toHaveBeenCalled();
    expect(outboxRepository.save).not.toHaveBeenCalled();
    expect(cacheService.deletePattern).not.toHaveBeenCalled();
  });
});
