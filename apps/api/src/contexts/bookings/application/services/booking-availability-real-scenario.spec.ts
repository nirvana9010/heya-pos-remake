import { Test, TestingModule } from '@nestjs/testing';
import { BookingAvailabilityService } from './booking-availability.service';
import { PrismaService } from '../../../../prisma/prisma.service';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { format } from 'date-fns';

describe('BookingAvailabilityService - Real User Scenario', () => {
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

  describe('User reported issue: 90-minute service 30 minutes before roster end', () => {
    const merchantId = 'merchant-123';
    const staffId = 'staff-123';
    const serviceId = 'service-123';
    const timezone = 'Australia/Sydney';
    
    // Create a test date that's a Monday
    const testDate = new Date('2024-01-08'); // Monday
    
    beforeEach(() => {
      // Mock merchant settings with business hours
      prisma.merchant.findUnique.mockResolvedValue({
        id: merchantId,
        settings: {
          businessHours: {
            sunday: { open: '09:00', close: '18:00', isOpen: false },
            monday: { open: '09:00', close: '21:00', isOpen: true }, // Open late
            tuesday: { open: '09:00', close: '21:00', isOpen: true },
            wednesday: { open: '09:00', close: '21:00', isOpen: true },
            thursday: { open: '09:00', close: '21:00', isOpen: true },
            friday: { open: '09:00', close: '21:00', isOpen: true },
            saturday: { open: '09:00', close: '18:00', isOpen: true },
          },
        },
      } as any);

      // Mock staff member
      prisma.staff.findFirst.mockResolvedValue({
        id: staffId,
        merchantId,
        firstName: 'Test',
        lastName: 'Staff',
      } as any);

      // Mock no existing bookings
      prisma.booking.findMany.mockResolvedValue([]);
    });

    it('should NOT allow booking 90-minute service at 16:30 when staff roster ends at 17:00', async () => {
      // Staff works 09:00-17:00 on Monday
      prisma.staffSchedule.findMany.mockResolvedValue([
        {
          staffId,
          dayOfWeek: 1, // Monday
          startTime: '09:00',
          endTime: '17:00', // Ends at 5 PM
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
        timezone,
      });

      // Filter to available slots only
      const availableSlots = result.filter(slot => slot.available);
      const slotTimes = availableSlots.map(slot => format(slot.startTime, 'HH:mm'));
      
      // Log for debugging
      console.log('Test scenario: 90-min service, staff ends at 17:00');
      console.log('Last few available slots:', slotTimes.slice(-5));
      
      // Should NOT include 16:30 (would end at 18:00, past roster)
      expect(slotTimes).not.toContain('16:30');
      
      // Should NOT include any slots after 15:30
      expect(slotTimes).not.toContain('15:45');
      expect(slotTimes).not.toContain('16:00');
      expect(slotTimes).not.toContain('16:15');
      expect(slotTimes).not.toContain('16:45');
      
      // Last slot should be 15:30 (ends at 17:00)
      if (availableSlots.length > 0) {
        const lastSlot = availableSlots[availableSlots.length - 1];
        const lastSlotTime = format(lastSlot.startTime, 'HH:mm');
        expect(lastSlotTime).toBe('15:30');
      }
    });

    it('should show correct slots for customer booking app with staff schedule', async () => {
      // Simulate the exact flow from booking app
      // Staff works limited hours
      prisma.staffSchedule.findMany.mockResolvedValue([
        {
          staffId,
          dayOfWeek: 1, // Monday
          startTime: '10:00', // Starts at 10 AM
          endTime: '16:00',   // Ends at 4 PM
        },
      ] as any);

      // 90-minute massage service
      prisma.service.findFirst.mockResolvedValue({
        id: serviceId,
        name: 'Deep Tissue Massage',
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
        timezone,
      });

      // Filter to available slots only
      const availableSlots = result.filter(slot => slot.available);
      const slotTimes = availableSlots.map(slot => format(slot.startTime, 'HH:mm'));
      
      console.log('\nCustomer booking scenario:');
      console.log('Service: 90-minute massage');
      console.log('Staff hours: 10:00-16:00');
      console.log('Available slots:', slotTimes);
      console.log('First slot:', slotTimes[0]);
      console.log('Last slot:', slotTimes[slotTimes.length - 1]);
      
      // First slot should be 10:00
      expect(slotTimes[0]).toBe('10:00');
      
      // Last slot should be 14:30 (ends at 16:00)
      expect(slotTimes[slotTimes.length - 1]).toBe('14:30');
      
      // Should NOT show any slots that would extend past 16:00
      const invalidSlots = ['14:45', '15:00', '15:15', '15:30', '15:45'];
      invalidSlots.forEach(slot => {
        expect(slotTimes).not.toContain(slot);
      });
    });

    it('should handle multiple services totaling more than roster time allows', async () => {
      // Staff works 10:00-12:00 (only 2 hours)
      prisma.staffSchedule.findMany.mockResolvedValue([
        {
          staffId,
          dayOfWeek: 1, // Monday
          startTime: '10:00',
          endTime: '12:00',
        },
      ] as any);

      // Single 30-minute service, but checking for 120 minutes total
      prisma.service.findFirst.mockResolvedValue({
        id: serviceId,
        duration: 30,
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
        timezone,
        duration: 120, // Override for multiple services
      });

      const availableSlots = result.filter(slot => slot.available);
      const slotTimes = availableSlots.map(slot => format(slot.startTime, 'HH:mm'));
      
      console.log('\nMulti-service scenario:');
      console.log('Total duration: 120 minutes');
      console.log('Staff hours: 10:00-12:00');
      console.log('Available slots:', slotTimes);
      
      // With only 2 hours available and needing 2 hours, only one slot at 10:00
      expect(slotTimes).toEqual(['10:00']);
    });
  });
});