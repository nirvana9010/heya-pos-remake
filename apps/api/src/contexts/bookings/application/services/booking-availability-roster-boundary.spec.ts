import { Test, TestingModule } from '@nestjs/testing';
import { BookingAvailabilityService } from './booking-availability.service';
import { PrismaService } from '../../../../prisma/prisma.service';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { startOfDay, setHours, setMinutes, format } from 'date-fns';

describe('BookingAvailabilityService - Roster Boundary Tests', () => {
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
        {
          provide: 'IBookingRepository',
          useValue: mockDeep<any>(),
        },
      ],
    }).compile();

    service = module.get<BookingAvailabilityService>(BookingAvailabilityService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service duration boundary checks', () => {
    const merchantId = 'merchant-123';
    const staffId = 'staff-123';
    const serviceId = 'service-123';
    const locationId = 'location-123';
    const testDate = startOfDay(new Date());
    // Ensure we're testing on a Monday (day 1)
    while (testDate.getDay() !== 1) {
      testDate.setDate(testDate.getDate() + 1);
    }

    beforeEach(() => {
      // Mock merchant with business hours
      prisma.merchant.findUnique.mockResolvedValue({
        id: merchantId,
        settings: {
          businessHours: {
            monday: { open: '09:00', close: '18:00', isOpen: true },
            tuesday: { open: '09:00', close: '18:00', isOpen: true },
            wednesday: { open: '09:00', close: '18:00', isOpen: true },
            thursday: { open: '09:00', close: '18:00', isOpen: true },
            friday: { open: '09:00', close: '18:00', isOpen: true },
            saturday: { open: '09:00', close: '18:00', isOpen: true },
            sunday: { open: '09:00', close: '18:00', isOpen: true },
          },
        },
      } as any);

      // Mock no existing bookings
      prisma.booking.findMany.mockResolvedValue([]);
    });

    it('should NOT show slots where 90-minute service would extend beyond staff roster hours', async () => {
      // Mock staff member
      prisma.staff.findFirst.mockResolvedValue({
        id: staffId,
        merchantId,
        firstName: 'Test',
        lastName: 'Staff',
      } as any);
      // Staff works 10:00-16:00
      prisma.staffSchedule.findMany.mockResolvedValue([
        {
          staffId,
          dayOfWeek: 1, // Monday
          startTime: '10:00',
          endTime: '16:00',
        },
      ] as any);

      // 90-minute service
      prisma.service.findFirst.mockResolvedValue({
        id: serviceId,
        duration: 90,
        paddingBefore: 0,
        paddingAfter: 0,
        isActive: true,
      } as any);

      const result = await service.getAvailableSlots({
        merchantId,
        staffId,
        serviceId,
        startDate: testDate,
        endDate: testDate,
        timezone: 'Australia/Sydney',
      });

      // Filter to available slots only
      const availableSlots = result.filter(slot => slot.available);
      
      // The last slot should NOT be 15:30 (which would end at 17:00, beyond 16:00 roster)
      const slotTimes = availableSlots.map(slot => 
        format(slot.startTime, 'HH:mm')
      );
      
      console.log('Available slot times for 90-min service:', slotTimes);
      
      // Last slot should be 14:30 at the latest (ends at 16:00)
      expect(slotTimes).not.toContain('15:30');
      expect(slotTimes).not.toContain('15:45');
      
      // Verify last slot
      if (availableSlots.length > 0) {
        const lastSlot = availableSlots[availableSlots.length - 1];
        const lastSlotTime = format(lastSlot.startTime, 'HH:mm');
        const [hours, minutes] = lastSlotTime.split(':').map(Number);
        
        // For a 90-minute service ending at 16:00, last slot should be 14:30
        expect(hours * 60 + minutes).toBeLessThanOrEqual(14 * 60 + 30);
      }
    });

    it('should show 15:00 slot for 60-minute service when staff works until 16:00', async () => {
      // Mock staff member
      prisma.staff.findFirst.mockResolvedValue({
        id: staffId,
        merchantId,
        firstName: 'Test',
        lastName: 'Staff',
      } as any);
      // Staff works 10:00-16:00
      prisma.staffSchedule.findMany.mockResolvedValue([
        {
          staffId,
          dayOfWeek: 1, // Monday
          startTime: '10:00',
          endTime: '16:00',
        },
      ] as any);

      // 60-minute service
      prisma.service.findFirst.mockResolvedValue({
        id: serviceId,
        duration: 60,
        paddingBefore: 0,
        paddingAfter: 0,
        isActive: true,
      } as any);

      const result = await service.getAvailableSlots({
        merchantId,
        staffId,
        serviceId,
        startDate: testDate,
        endDate: testDate,
        timezone: 'Australia/Sydney',
      });

      const availableSlots = result.filter(slot => slot.available);
      const slotTimes = availableSlots.map(slot => 
        format(slot.startTime, 'HH:mm')
      );

      // Should include 15:00 (ends at 16:00)
      expect(slotTimes).toContain('15:00');
      // Should NOT include 15:15 or later
      expect(slotTimes).not.toContain('15:15');
      expect(slotTimes).not.toContain('15:30');
      expect(slotTimes).not.toContain('15:45');
    });

    it('should handle service with padding correctly', async () => {
      // Mock staff member
      prisma.staff.findFirst.mockResolvedValue({
        id: staffId,
        merchantId,
        firstName: 'Test',
        lastName: 'Staff',
      } as any);
      // Staff works 10:00-16:00
      prisma.staffSchedule.findMany.mockResolvedValue([
        {
          staffId,
          dayOfWeek: 1, // Monday
          startTime: '10:00',
          endTime: '16:00',
        },
      ] as any);

      // 60-minute service with 15 minutes padding before and after
      prisma.service.findFirst.mockResolvedValue({
        id: serviceId,
        duration: 60,
        paddingBefore: 15,
        paddingAfter: 15,
        isActive: true,
      } as any);

      const result = await service.getAvailableSlots({
        merchantId,
        staffId,
        serviceId,
        startDate: testDate,
        endDate: testDate,
        timezone: 'Australia/Sydney',
      });

      const availableSlots = result.filter(slot => slot.available);
      const slotTimes = availableSlots.map(slot => 
        format(slot.startTime, 'HH:mm')
      );

      // Total duration is 60 + 15 + 15 = 90 minutes
      // So last slot should be 14:30 (ends at 16:00)
      if (availableSlots.length > 0) {
        const lastSlot = availableSlots[availableSlots.length - 1];
        const lastSlotTime = format(lastSlot.startTime, 'HH:mm');
        const [hours, minutes] = lastSlotTime.split(':').map(Number);
        
        expect(hours * 60 + minutes).toBeLessThanOrEqual(14 * 60 + 30);
      }
    });

    it('should respect custom duration passed for multi-service bookings', async () => {
      // Mock staff member
      prisma.staff.findFirst.mockResolvedValue({
        id: staffId,
        merchantId,
        firstName: 'Test',
        lastName: 'Staff',
      } as any);
      // Staff works 10:00-17:00
      prisma.staffSchedule.findMany.mockResolvedValue([
        {
          staffId,
          dayOfWeek: 1, // Monday
          startTime: '10:00',
          endTime: '17:00',
        },
      ] as any);

      // Single service is 30 minutes
      prisma.service.findFirst.mockResolvedValue({
        id: serviceId,
        duration: 30,
        paddingBefore: 0,
        paddingAfter: 0,
        isActive: true,
      } as any);

      // But we're checking availability for multiple services totaling 120 minutes
      const result = await service.getAvailableSlots({
        merchantId,
        staffId,
        serviceId,
        startDate: testDate,
        endDate: testDate,
        timezone: 'Australia/Sydney',
        duration: 120, // Override duration for multi-service booking
      });

      const availableSlots = result.filter(slot => slot.available);
      
      if (availableSlots.length > 0) {
        const lastSlot = availableSlots[availableSlots.length - 1];
        const lastSlotTime = format(lastSlot.startTime, 'HH:mm');
        const [hours, minutes] = lastSlotTime.split(':').map(Number);
        
        // For 120-minute total duration ending at 17:00, last slot should be 15:00
        expect(hours * 60 + minutes).toBeLessThanOrEqual(15 * 60);
      }
    });
  });
});