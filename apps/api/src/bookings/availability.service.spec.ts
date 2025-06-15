import { Test, TestingModule } from '@nestjs/testing';
import { AvailabilityService } from './availability.service';
import { PrismaService } from '../prisma/prisma.service';
import { BookingRepository } from './booking.repository';
import { ConflictException } from '@nestjs/common';
import { addMinutes } from 'date-fns';

describe('AvailabilityService', () => {
  let service: AvailabilityService;
  let prisma: PrismaService;
  let bookingRepository: BookingRepository;

  const mockPrismaService = {
    service: {
      findUnique: jest.fn(),
    },
    staff: {
      findUnique: jest.fn(),
    },
    booking: {
      findMany: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
    $executeRaw: jest.fn(),
  };

  const mockBookingRepository = {
    findConflictingBookings: jest.fn(),
    createWithLock: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AvailabilityService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: BookingRepository,
          useValue: mockBookingRepository,
        },
      ],
    }).compile();

    service = module.get<AvailabilityService>(AvailabilityService);
    prisma = module.get<PrismaService>(PrismaService);
    bookingRepository = module.get<BookingRepository>(BookingRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createBookingWithLock', () => {
    const mockService = {
      id: 'service-1',
      name: 'Haircut',
      duration: 60,
      price: 50,
      paddingBefore: 5,
      paddingAfter: 10,
    };

    const mockStaff = {
      id: 'staff-1',
      firstName: 'John',
      lastName: 'Doe',
    };

    const createBookingDto = {
      staffId: 'staff-1',
      serviceId: 'service-1',
      customerId: 'customer-1',
      startTime: new Date('2025-06-15T10:00:00Z'),
      locationId: 'location-1',
      merchantId: 'merchant-1',
      createdById: 'staff-1',
      isOverride: false,
    };

    it('should create a booking successfully when no conflicts exist', async () => {
      mockPrismaService.service.findUnique.mockResolvedValue(mockService);
      
      const mockCreatedBooking = {
        id: 'booking-1',
        bookingNumber: 'BK123456',
        ...createBookingDto,
        endTime: addMinutes(createBookingDto.startTime, mockService.duration),
        customer: { firstName: 'Jane', lastName: 'Smith' },
        provider: mockStaff,
        location: { timezone: 'Australia/Sydney' },
        services: [{
          service: mockService,
          staff: mockStaff,
        }],
      };

      // Mock BookingRepository methods
      mockBookingRepository.findConflictingBookings.mockResolvedValue([]);
      mockBookingRepository.createWithLock.mockResolvedValue(mockCreatedBooking);

      const result = await service.createBookingWithLock(createBookingDto);

      expect(result).toEqual(mockCreatedBooking);
      expect(mockBookingRepository.createWithLock).toHaveBeenCalledWith(
        expect.objectContaining({
          staffId: createBookingDto.staffId,
          serviceId: createBookingDto.serviceId,
          customerId: createBookingDto.customerId,
          startTime: createBookingDto.startTime,
          endTime: addMinutes(createBookingDto.startTime, mockService.duration),
          locationId: createBookingDto.locationId,
          merchantId: createBookingDto.merchantId,
          notes: undefined,
          source: 'ONLINE',
          createdById: createBookingDto.createdById,
          isOverride: false,
          overrideReason: undefined,
        }),
        createBookingDto.merchantId
      );
    });

    it('should throw ConflictException when overlapping booking exists', async () => {
      mockPrismaService.service.findUnique.mockResolvedValue(mockService);

      const conflictError = new ConflictException({
        message: 'Time slot has conflicts',
        conflicts: [{
          id: 'existing-booking',
          bookingNumber: 'BK999999',
          startTime: new Date('2025-06-15T09:30:00Z'),
          endTime: new Date('2025-06-15T10:30:00Z'),
        }],
        requiresOverride: true,
      });

      // Mock BookingRepository to throw conflict exception
      mockBookingRepository.createWithLock.mockRejectedValue(conflictError);

      await expect(service.createBookingWithLock(createBookingDto))
        .rejects
        .toThrow(ConflictException);
        
      expect(mockBookingRepository.createWithLock).toHaveBeenCalled();
    });

    it('should allow booking creation with override flag even if conflicts exist', async () => {
      mockPrismaService.service.findUnique.mockResolvedValue(mockService);

      const overrideDto = {
        ...createBookingDto,
        isOverride: true,
        overrideReason: 'Customer requested specific time',
        overrideApprovedBy: 'manager-1',
      };

      const mockCreatedBooking = {
        id: 'booking-2',
        bookingNumber: 'BK123457',
        ...overrideDto,
        endTime: addMinutes(overrideDto.startTime, mockService.duration),
        customer: { firstName: 'Jane', lastName: 'Smith' },
        provider: mockStaff,
        location: { timezone: 'Australia/Sydney' },
        services: [{
          service: mockService,
          staff: mockStaff,
        }],
      };

      // Mock BookingRepository - even with conflicts, override should work
      const existingBooking = {
        id: 'existing-booking',
        bookingNumber: 'BK999999',
        startTime: new Date('2025-06-15T10:00:00Z'),
        endTime: new Date('2025-06-15T11:00:00Z'),
      };
      
      mockBookingRepository.findConflictingBookings.mockResolvedValue([existingBooking]);
      mockBookingRepository.createWithLock.mockResolvedValue(mockCreatedBooking);

      const result = await service.createBookingWithLock(overrideDto);

      expect(result).toEqual(mockCreatedBooking);
      expect(result.isOverride).toBe(true);
      expect(result.overrideReason).toBe('Customer requested specific time');
      
      // Should still call createWithLock despite conflicts due to override
      expect(mockBookingRepository.createWithLock).toHaveBeenCalled();
    });
  });

  describe('getAvailableSlots', () => {
    it('should return available slots based on business hours', async () => {
      const mockService = {
        id: 'service-1',
        duration: 60,
        paddingBefore: 0,
        paddingAfter: 0,
      };

      const mockStaff = {
        id: 'staff-1',
        locations: [{
          isPrimary: true,
          location: {
            businessHours: {
              monday: { open: '09:00', close: '17:00' },
            },
          },
        }],
      };

      mockPrismaService.service.findUnique.mockResolvedValue(mockService);
      mockPrismaService.staff.findUnique.mockResolvedValue(mockStaff);
      mockPrismaService.booking.findMany.mockResolvedValue([]);

      const startDate = new Date('2025-06-16T00:00:00Z'); // Monday
      const endDate = new Date('2025-06-16T23:59:59Z');

      const slots = await service.getAvailableSlots({
        staffId: 'staff-1',
        serviceId: 'service-1',
        startDate,
        endDate,
        timezone: 'Australia/Sydney',
      });

      // Should have slots from 9 AM to 4 PM (last slot at 4 PM for 1-hour service)
      expect(slots.length).toBeGreaterThan(0);
      expect(slots.every(slot => slot.available)).toBe(true);
    });
  });
});