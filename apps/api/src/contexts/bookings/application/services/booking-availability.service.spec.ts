import { Test, TestingModule } from '@nestjs/testing';
import { BookingAvailabilityService } from './booking-availability.service';
import { PrismaService } from '../../../../prisma/prisma.service';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { add, format, startOfDay } from 'date-fns';

describe('BookingAvailabilityService', () => {
  let service: BookingAvailabilityService;
  let prisma: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingAvailabilityService,
        {
          provide: PrismaService,
          useValue: mockDeep<PrismaService>(),
        },
      ],
    }).compile();

    service = module.get<BookingAvailabilityService>(BookingAvailabilityService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkAvailability with staff schedules', () => {
    const merchantId = 'merchant-123';
    const staffId = 'staff-123';
    const serviceId = 'service-123';
    const testDate = startOfDay(new Date());
    const dayOfWeek = testDate.getDay();

    beforeEach(() => {
      // Mock merchant settings with business hours
      prisma.merchant.findUnique.mockResolvedValue({
        id: merchantId,
        settings: {
          businessHours: {
            monday: { open: '09:00', close: '18:00', isOpen: true },
            tuesday: { open: '09:00', close: '18:00', isOpen: true },
            wednesday: { open: '09:00', close: '18:00', isOpen: true },
            thursday: { open: '09:00', close: '18:00', isOpen: true },
            friday: { open: '09:00', close: '18:00', isOpen: true },
            saturday: { open: '10:00', close: '16:00', isOpen: true },
            sunday: { open: '10:00', close: '16:00', isOpen: false },
          },
        },
      } as any);

      // Mock service details
      prisma.service.findFirst.mockResolvedValue({
        id: serviceId,
        duration: 60,
        isActive: true,
      } as any);

      // Mock no existing bookings
      prisma.booking.findMany.mockResolvedValue([]);
    });

    it('should respect staff schedule when checking availability', async () => {
      // Mock staff with limited schedule (10:00-15:00)
      prisma.staff.findMany.mockResolvedValue([
        {
          id: staffId,
          status: 'ACTIVE',
        },
      ] as any);

      // Mock staff schedule - only available 10:00-15:00
      prisma.staffSchedule.findMany.mockResolvedValue([
        {
          staffId,
          dayOfWeek,
          startTime: '10:00',
          endTime: '15:00',
        },
      ] as any);

      const result = await service.checkAvailability({
        merchantId,
        date: testDate,
        services: [{ id: serviceId, duration: 60 }],
        staffId,
      });

      // Should only return slots within staff schedule (10:00-15:00)
      expect(result.availableSlots).toBeDefined();
      expect(result.availableSlots.length).toBeGreaterThan(0);
      
      // Verify all slots are within staff hours
      result.availableSlots.forEach(slot => {
        const slotTime = parseInt(slot.time.split(':')[0]);
        expect(slotTime).toBeGreaterThanOrEqual(10);
        expect(slotTime).toBeLessThan(15); // Last slot should start before 15:00
      });
    });

    it('should return no slots when staff has no schedule for the day', async () => {
      // Mock staff
      prisma.staff.findMany.mockResolvedValue([
        {
          id: staffId,
          status: 'ACTIVE',
        },
      ] as any);

      // Mock no schedule for this day
      prisma.staffSchedule.findMany.mockResolvedValue([]);

      const result = await service.checkAvailability({
        merchantId,
        date: testDate,
        services: [{ id: serviceId, duration: 60 }],
        staffId,
      });

      // Should return no available slots
      expect(result.availableSlots).toHaveLength(0);
    });

    it('should fall back to business hours when no specific staff is requested', async () => {
      // Mock multiple staff
      prisma.staff.findMany.mockResolvedValue([
        { id: 'staff-1', status: 'ACTIVE' },
        { id: 'staff-2', status: 'ACTIVE' },
      ] as any);

      // Mock different schedules for each staff
      prisma.staffSchedule.findMany.mockResolvedValue([
        {
          staffId: 'staff-1',
          dayOfWeek,
          startTime: '09:00',
          endTime: '12:00',
        },
        {
          staffId: 'staff-2',
          dayOfWeek,
          startTime: '13:00',
          endTime: '18:00',
        },
      ] as any);

      const result = await service.checkAvailability({
        merchantId,
        date: testDate,
        services: [{ id: serviceId, duration: 60 }],
        // No specific staff requested
      });

      // Should have slots from both staff schedules
      expect(result.availableSlots).toBeDefined();
      expect(result.availableSlots.length).toBeGreaterThan(0);
      
      // Should have morning slots from staff-1 and afternoon slots from staff-2
      const morningSlots = result.availableSlots.filter(s => parseInt(s.time.split(':')[0]) < 12);
      const afternoonSlots = result.availableSlots.filter(s => parseInt(s.time.split(':')[0]) >= 13);
      
      expect(morningSlots.length).toBeGreaterThan(0);
      expect(afternoonSlots.length).toBeGreaterThan(0);
    });

    it('should handle overlapping staff schedules correctly', async () => {
      // Mock staff
      prisma.staff.findMany.mockResolvedValue([
        { id: staffId, status: 'ACTIVE' },
      ] as any);

      // Mock overlapping schedules (should not happen, but handle gracefully)
      prisma.staffSchedule.findMany.mockResolvedValue([
        {
          staffId,
          dayOfWeek,
          startTime: '09:00',
          endTime: '13:00',
        },
        {
          staffId,
          dayOfWeek,
          startTime: '11:00',
          endTime: '17:00',
        },
      ] as any);

      const result = await service.checkAvailability({
        merchantId,
        date: testDate,
        services: [{ id: serviceId, duration: 60 }],
        staffId,
      });

      // Should handle the overlap and provide slots from 09:00-17:00
      expect(result.availableSlots).toBeDefined();
      const slots = result.availableSlots.map(s => s.time);
      
      // Should have slots covering the full range
      expect(slots.some(s => s.startsWith('09:'))).toBeTruthy();
      expect(slots.some(s => s.startsWith('16:'))).toBeTruthy();
    });

    it('should exclude slots that conflict with existing bookings', async () => {
      // Mock staff and schedule
      prisma.staff.findMany.mockResolvedValue([
        { id: staffId, status: 'ACTIVE' },
      ] as any);

      prisma.staffSchedule.findMany.mockResolvedValue([
        {
          staffId,
          dayOfWeek,
          startTime: '09:00',
          endTime: '17:00',
        },
      ] as any);

      // Mock existing booking from 11:00-12:00
      const bookingStart = new Date(testDate);
      bookingStart.setHours(11, 0, 0, 0);
      const bookingEnd = new Date(testDate);
      bookingEnd.setHours(12, 0, 0, 0);

      prisma.booking.findMany.mockResolvedValue([
        {
          id: 'booking-123',
          startTime: bookingStart,
          endTime: bookingEnd,
          status: 'CONFIRMED',
          staffId,
        },
      ] as any);

      const result = await service.checkAvailability({
        merchantId,
        date: testDate,
        services: [{ id: serviceId, duration: 60 }],
        staffId,
      });

      // Should not have slots at 11:00
      const elevenAmSlot = result.availableSlots.find(s => s.time === '11:00');
      expect(elevenAmSlot).toBeUndefined();
    });

    it('should respect business hours when staff schedule extends beyond them', async () => {
      // Mock staff with schedule that goes beyond business hours
      prisma.staff.findMany.mockResolvedValue([
        { id: staffId, status: 'ACTIVE' },
      ] as any);

      // Staff available 08:00-20:00 (beyond business hours)
      prisma.staffSchedule.findMany.mockResolvedValue([
        {
          staffId,
          dayOfWeek,
          startTime: '08:00',
          endTime: '20:00',
        },
      ] as any);

      const result = await service.checkAvailability({
        merchantId,
        date: testDate,
        services: [{ id: serviceId, duration: 60 }],
        staffId,
      });

      // Should limit to business hours (09:00-18:00)
      const slots = result.availableSlots.map(s => s.time);
      
      // First slot should not be before 09:00
      const firstSlotHour = parseInt(slots[0]?.split(':')[0] || '0');
      expect(firstSlotHour).toBeGreaterThanOrEqual(9);
      
      // Last slot should not start after 17:00 (for a 60-min service)
      const lastSlotHour = parseInt(slots[slots.length - 1]?.split(':')[0] || '0');
      expect(lastSlotHour).toBeLessThanOrEqual(17);
    });
  });

  describe('edge cases', () => {
    const merchantId = 'merchant-123';

    it('should handle when merchant has no business hours configured', async () => {
      // Mock merchant without business hours
      prisma.merchant.findUnique.mockResolvedValue({
        id: merchantId,
        settings: {},
      } as any);

      prisma.service.findFirst.mockResolvedValue({
        id: 'service-123',
        duration: 60,
        isActive: true,
      } as any);

      prisma.staff.findMany.mockResolvedValue([]);
      prisma.booking.findMany.mockResolvedValue([]);

      const result = await service.checkAvailability({
        merchantId,
        date: new Date(),
        services: [{ id: 'service-123', duration: 60 }],
      });

      // Should return empty slots when no business hours
      expect(result.availableSlots).toHaveLength(0);
    });

    it('should handle inactive staff members', async () => {
      prisma.merchant.findUnique.mockResolvedValue({
        id: merchantId,
        settings: {
          businessHours: {
            monday: { open: '09:00', close: '18:00', isOpen: true },
          },
        },
      } as any);

      // Mock inactive staff
      prisma.staff.findMany.mockResolvedValue([
        { id: 'staff-123', status: 'INACTIVE' },
      ] as any);

      prisma.service.findFirst.mockResolvedValue({
        id: 'service-123',
        duration: 60,
        isActive: true,
      } as any);

      const result = await service.checkAvailability({
        merchantId,
        date: new Date(),
        services: [{ id: 'service-123', duration: 60 }],
        staffId: 'staff-123',
      });

      // Should return no slots for inactive staff
      expect(result.availableSlots).toHaveLength(0);
    });
  });
});