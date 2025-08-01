import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { PrismaService } from '../prisma/prisma.service';
import { MerchantService } from '../merchant/merchant.service';
import { getNextStaffColor } from '../utils/color.utils';
import * as bcrypt from 'bcrypt';

@Injectable()
export class StaffService {
  constructor(
    private prisma: PrismaService,
    private merchantService: MerchantService,
  ) {}

  async create(merchantId: string, createStaffDto: CreateStaffDto) {
    console.log('CreateStaffDto received:', JSON.stringify(createStaffDto, null, 2));
    
    // Check if email already exists (only if email is provided)
    if (createStaffDto.email) {
      const existingStaff = await this.prisma.staff.findUnique({
        where: { email: createStaffDto.email },
      });

      if (existingStaff) {
        throw new ConflictException('Staff member with this email already exists');
      }
    }

    // Get merchant settings to check if PIN is required
    const settings = await this.merchantService.getMerchantSettings(merchantId);
    const requirePinForStaff = settings?.requirePinForStaff ?? true;

    let pin = createStaffDto.pin;
    let generatedPin: string | undefined;

    // Handle PIN logic
    if (!pin) {
      // Always generate a PIN if not provided
      generatedPin = Math.floor(1000 + Math.random() * 9000).toString();
      pin = generatedPin;
    } else {
      // Validate PIN format if provided
      if (!/^\d{4}$/.test(pin)) {
        throw new BadRequestException('PIN must be exactly 4 digits');
      }
    }

    // Hash the PIN
    const hashedPin = await bcrypt.hash(pin, 10);

    // Extract fields for separate handling or removal
    const { locationIds, role, permissions, ...staffData } = createStaffDto;

    // Handle auto color assignment
    let calendarColor = staffData.calendarColor;
    if (!calendarColor || calendarColor === 'auto') {
      // Get all existing staff colors
      const existingStaff = await this.prisma.staff.findMany({
        where: { merchantId },
        select: { calendarColor: true },
      });
      
      const usedColors = existingStaff
        .map(s => s.calendarColor)
        .filter(color => color); // Filter out null/undefined colors
      
      const staffCount = existingStaff.length;
      calendarColor = getNextStaffColor(usedColors, staffCount);
    }

    // Create clean data object without unwanted fields
    const createData: any = {
      firstName: staffData.firstName,
      accessLevel: staffData.accessLevel || 1,
      calendarColor,
      merchantId,
      pin: hashedPin,
      status: staffData.status || 'ACTIVE',
    };

    // Only add optional fields if they have values
    if (staffData.lastName) {
      createData.lastName = staffData.lastName;
    }
    if (staffData.email) {
      createData.email = staffData.email;
    }
    if (staffData.phone) {
      createData.phone = staffData.phone;
    }

    console.log('CreateData being sent to Prisma:', JSON.stringify(createData, null, 2));

    // Create staff member (role and permissions are handled through accessLevel)
    const staff = await this.prisma.staff.create({
      data: createData,
    });

    // Add staff to locations if provided
    if (locationIds && locationIds.length > 0) {
      await this.prisma.staffLocation.createMany({
        data: locationIds.map((locationId, index) => ({
          staffId: staff.id,
          locationId,
          isPrimary: index === 0, // First location is primary
        })),
      });
    }

    // Auto-create staff schedules based on merchant business hours
    await this.createDefaultSchedules(staff.id, merchantId);

    // Return staff WITH PIN (plain text) for display to managers
    const { pin: hashedPinField, ...staffWithoutPin } = staff;
    return {
      ...staffWithoutPin,
      pin: generatedPin || createStaffDto.pin, // Return the plain text PIN for display
      generatedPin: generatedPin ? true : false, // Indicate if PIN was generated
      name: staff.lastName ? `${staff.firstName} ${staff.lastName}` : staff.firstName,
      isActive: staff.status === 'ACTIVE',
    };
  }

  /**
   * Create default schedules for a staff member based on merchant business hours
   */
  private async createDefaultSchedules(staffId: string, merchantId: string) {
    try {
      // Get merchant settings
      const merchant = await this.prisma.merchant.findUnique({
        where: { id: merchantId },
        select: { settings: true }
      });

      if (!merchant?.settings) {
        console.warn(`No merchant settings found for ${merchantId}, skipping schedule creation`);
        return;
      }

      const settings = merchant.settings as any;
      const businessHours = settings.businessHours;

      if (!businessHours) {
        console.warn(`No business hours configured for merchant ${merchantId}, skipping schedule creation`);
        return;
      }

      // Create schedules based on business hours
      const scheduleData = [];
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      
      for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
        const dayName = dayNames[dayOfWeek];
        const dayHours = businessHours[dayName] || businessHours[dayName.charAt(0).toUpperCase() + dayName.slice(1)];
        
        if (dayHours && dayHours.isOpen) {
          scheduleData.push({
            staffId: staffId,
            dayOfWeek: dayOfWeek,
            startTime: dayHours.open,
            endTime: dayHours.close
          });
        }
      }

      if (scheduleData.length > 0) {
        await this.prisma.staffSchedule.createMany({
          data: scheduleData
        });
        console.log(`Created ${scheduleData.length} default schedules for staff ${staffId}`);
      }
    } catch (error) {
      console.error('Error creating default schedules:', error);
      // Don't throw - staff creation should still succeed even if schedule creation fails
    }
  }

  async findAll(merchantId: string, isActive?: boolean) {
    const where: any = { merchantId };
    
    // Filter by active status if specified
    if (isActive !== undefined) {
      where.status = isActive ? 'ACTIVE' : 'INACTIVE';
    }
    
    const staff = await this.prisma.staff.findMany({
      where,
      include: {
        locations: {
          include: {
            location: true,
          },
        },
      },
      orderBy: [{ status: 'asc' }, { lastName: 'asc' }, { firstName: 'asc' }],
    });

    // For list view, don't show PINs (security best practice)
    return staff.map(({ pin, ...staffMember }) => ({
      ...staffMember,
      name: staffMember.lastName ? `${staffMember.firstName} ${staffMember.lastName}` : staffMember.firstName,
      isActive: staffMember.status === 'ACTIVE',
      hasPinSet: true, // Indicate PIN is set without showing it
    }));
  }

  async findOne(merchantId: string, id: string) {
    const staff = await this.prisma.staff.findFirst({
      where: {
        id,
        merchantId,
      },
      include: {
        locations: {
          include: {
            location: true,
          },
        },
        bookingsAsProvider: {
          where: {
            status: {
              in: ['CONFIRMED', 'IN_PROGRESS'],
            },
            startTime: {
              gte: new Date(),
            },
          },
          orderBy: {
            startTime: 'asc',
          },
          take: 10,
        },
      },
    });

    if (!staff) {
      throw new NotFoundException('Staff member not found');
    }

    // For detail view, include PIN indicator but not the actual PIN
    const { pin, ...staffWithoutPin } = staff;
    return {
      ...staffWithoutPin,
      name: staff.lastName ? `${staff.firstName} ${staff.lastName}` : staff.firstName,
      isActive: staff.status === 'ACTIVE',
      hasPinSet: true,
    };
  }

  async update(merchantId: string, id: string, updateStaffDto: UpdateStaffDto) {
    // Check if staff exists
    const existingStaff = await this.prisma.staff.findFirst({
      where: {
        id,
        merchantId,
      },
    });

    if (!existingStaff) {
      throw new NotFoundException('Staff member not found');
    }

    // Extract locationIds and pin for separate handling
    const { locationIds, pin, ...updateData } = updateStaffDto;

    // Hash new PIN if provided
    let plainTextPin: string | undefined;
    if (pin) {
      // Validate PIN format
      if (!/^\d{4}$/.test(pin)) {
        throw new BadRequestException('PIN must be exactly 4 digits');
      }
      updateData['pin'] = await bcrypt.hash(pin, 10);
      plainTextPin = pin; // Store for response
    }

    // Update staff
    const updatedStaff = await this.prisma.staff.update({
      where: { id },
      data: updateData as any,
    });

    // Update locations if provided
    if (locationIds !== undefined) {
      // Remove all existing locations
      await this.prisma.staffLocation.deleteMany({
        where: { staffId: id },
      });

      // Add new locations
      if (locationIds.length > 0) {
        await this.prisma.staffLocation.createMany({
          data: locationIds.map((locationId, index) => ({
            staffId: id,
            locationId,
            isPrimary: index === 0,
          })),
        });
      }
    }

    // Return updated staff with PIN if it was changed
    const { pin: _, ...staffWithoutPin } = updatedStaff;
    return {
      ...staffWithoutPin,
      name: `${updatedStaff.firstName} ${updatedStaff.lastName}`,
      isActive: updatedStaff.status === 'ACTIVE',
      ...(plainTextPin && { pin: plainTextPin }), // Include plain text PIN if it was updated
    };
  }

  async remove(merchantId: string, id: string) {
    const staff = await this.prisma.staff.findFirst({
      where: {
        id,
        merchantId,
      },
    });

    if (!staff) {
      throw new NotFoundException('Staff member not found');
    }

    // Check if staff has future bookings
    const futureBookings = await this.prisma.booking.count({
      where: {
        providerId: id,
        startTime: {
          gte: new Date(),
        },
        status: {
          in: ['CONFIRMED', 'PENDING'],
        },
      },
    });

    if (futureBookings > 0) {
      throw new BadRequestException(
        'Cannot delete staff member with future bookings. Please reassign or cancel bookings first.'
      );
    }

    // Soft delete by setting status to TERMINATED
    const deletedStaff = await this.prisma.staff.update({
      where: { id },
      data: {
        status: 'INACTIVE' as const,
      },
    });

    const { pin, ...staffWithoutPin } = deletedStaff;
    return staffWithoutPin;
  }

  async hardRemove(merchantId: string, id: string) {
    const staff = await this.prisma.staff.findFirst({
      where: {
        id,
        merchantId,
      },
    });

    if (!staff) {
      throw new NotFoundException('Staff member not found');
    }

    // Check if staff has any bookings (past or future)
    const bookingsCount = await this.prisma.booking.count({
      where: {
        providerId: id,
      },
    });

    // Log warning if staff has bookings but proceed with deletion
    if (bookingsCount > 0) {
      console.warn(`[StaffService] Force deleting staff member ${id} with ${bookingsCount} booking records`);
    }

    // Delete related records and handle bookings
    await this.prisma.$transaction([
      // Set providerId to null for all bookings (preserve booking history but remove staff reference)
      this.prisma.booking.updateMany({
        where: { providerId: id },
        data: { providerId: null },
      }),
      // Delete staff locations
      this.prisma.staffLocation.deleteMany({
        where: { staffId: id },
      }),
      // Delete staff schedules
      this.prisma.staffSchedule.deleteMany({
        where: { staffId: id },
      }),
      // Delete the staff member
      this.prisma.staff.delete({
        where: { id },
      }),
    ]);

    return { 
      message: 'Staff member permanently deleted',
      bookingsAffected: bookingsCount 
    };
  }

  async verifyPin(merchantId: string, staffId: string, pin: string): Promise<boolean> {
    const staff = await this.prisma.staff.findFirst({
      where: {
        id: staffId,
        merchantId,
        status: 'ACTIVE',
      },
    });

    if (!staff) {
      return false;
    }

    return bcrypt.compare(pin, staff.pin);
  }

  async getAvailableStaff(merchantId: string, date: Date, serviceId?: string) {
    // This is a simplified version - in production, you'd check:
    // - Staff working hours
    // - Existing bookings
    // - Service skills/qualifications
    // - Location availability

    const staff = await this.prisma.staff.findMany({
      where: {
        merchantId,
        status: 'ACTIVE',
      },
      include: {
        bookingsAsProvider: {
          where: {
            startTime: {
              gte: new Date(date.setHours(0, 0, 0, 0)),
              lt: new Date(date.setHours(23, 59, 59, 999)),
            },
            status: {
              notIn: ['CANCELLED', 'NO_SHOW'],
            },
          },
        },
      },
    });

    return staff.map(({ pin, ...staffMember }) => ({
      ...staffMember,
      name: staffMember.lastName ? `${staffMember.firstName} ${staffMember.lastName}` : staffMember.firstName,
      isActive: true,
      isAvailable: true, // Simplified - should check actual availability
    }));
  }

  // New method to get staff PIN for managers/owners only
  async getStaffPin(merchantId: string, staffId: string): Promise<string | null> {
    // This method should only be called after verifying the requester is a manager/owner
    // The controller should handle that authorization
    
    // For now, we can't retrieve the original PIN since it's hashed
    // In a real implementation, you might want to:
    // 1. Store PINs encrypted (not hashed) if you need to show them
    // 2. Or generate a new PIN when requested
    // 3. Or never show PINs after creation
    
    // For this implementation, we'll return null indicating PIN can't be retrieved
    return null;
  }

  async getAllSchedules(merchantId: string) {
    // Get all active staff with their schedules
    const staff = await this.prisma.staff.findMany({
      where: {
        merchantId,
        status: 'ACTIVE',
      },
      include: {
        schedules: {
          orderBy: {
            dayOfWeek: 'asc',
          },
        },
      },
    });

    return staff.map(s => ({
      staffId: s.id,
      staffName: `${s.firstName} ${s.lastName || ''}`.trim(),
      schedules: s.schedules.map(schedule => ({
        dayOfWeek: schedule.dayOfWeek,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
      })),
    }));
  }

  async getSchedule(merchantId: string, staffId: string) {
    // Verify staff belongs to merchant
    const staff = await this.prisma.staff.findFirst({
      where: {
        id: staffId,
        merchantId,
      },
    });

    if (!staff) {
      throw new NotFoundException('Staff member not found');
    }

    // Get schedules for this staff member
    const schedules = await this.prisma.staffSchedule.findMany({
      where: {
        staffId,
      },
      orderBy: {
        dayOfWeek: 'asc',
      },
    });

    return {
      staffId,
      staffName: `${staff.firstName} ${staff.lastName || ''}`.trim(),
      schedules: schedules.map(s => ({
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
      })),
    };
  }

  async updateSchedule(
    merchantId: string,
    staffId: string,
    data: { schedules: Array<{ dayOfWeek: number; startTime: string; endTime: string }> }
  ) {
    console.log('[StaffService] updateSchedule called for:', staffId, 'with schedules:', data.schedules.length);
    
    try {
      // Verify staff belongs to merchant
      const staff = await this.prisma.staff.findFirst({
        where: {
          id: staffId,
          merchantId,
        },
      });

      if (!staff) {
        throw new NotFoundException('Staff member not found');
      }

      // Delete existing schedules for this staff
      const deleteResult = await this.prisma.staffSchedule.deleteMany({
        where: {
          staffId,
        },
      });
      console.log('[StaffService] Deleted', deleteResult.count, 'existing schedules');

      // Create new schedules
      if (data.schedules.length > 0) {
        const createResult = await this.prisma.staffSchedule.createMany({
          data: data.schedules.map(schedule => ({
            staffId,
            dayOfWeek: schedule.dayOfWeek,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
          })),
        });
        console.log('[StaffService] Created', createResult.count, 'new schedules');
      }

      // Return updated schedule
      const result = await this.getSchedule(merchantId, staffId);
      console.log('[StaffService] Returning schedule for:', staffId);
      return result;
    } catch (error) {
      console.error('[StaffService] updateSchedule error:', error);
      throw error;
    }
  }

  async getScheduleOverrides(merchantId: string, staffId: string, startDate?: string, endDate?: string) {
    // Verify staff belongs to merchant
    const staff = await this.prisma.staff.findFirst({
      where: {
        id: staffId,
        merchantId,
      },
    });

    if (!staff) {
      throw new NotFoundException('Staff member not found');
    }

    const where: any = { staffId };
    
    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        where.date.lte = new Date(endDate);
      }
    }

    const overrides = await this.prisma.scheduleOverride.findMany({
      where,
      orderBy: {
        date: 'asc',
      },
    });

    const result = overrides.map(override => ({
      ...override,
      date: override.date.toISOString().split('T')[0],
    }));
    
    console.log('[StaffService] Overrides found:', result.length, 'for staff:', staffId);
    return result;
  }

  async createOrUpdateScheduleOverride(
    merchantId: string, 
    staffId: string,
    data: { date: string; startTime: string | null; endTime: string | null; reason?: string }
  ) {
    console.log('[StaffService] createOrUpdateScheduleOverride called:', { merchantId, staffId, data });
    
    // Verify staff belongs to merchant
    const staff = await this.prisma.staff.findFirst({
      where: {
        id: staffId,
        merchantId,
      },
    });

    if (!staff) {
      throw new NotFoundException('Staff member not found');
    }

    // Validate times if provided
    if (data.startTime && data.endTime) {
      const start = new Date(`2000-01-01T${data.startTime}`);
      const end = new Date(`2000-01-01T${data.endTime}`);
      if (start >= end) {
        throw new BadRequestException('End time must be after start time');
      }
    }

    const override = await this.prisma.scheduleOverride.upsert({
      where: {
        staffId_date: {
          staffId,
          date: new Date(data.date),
        },
      },
      update: {
        startTime: data.startTime,
        endTime: data.endTime,
        reason: data.reason,
      },
      create: {
        staffId,
        date: new Date(data.date),
        startTime: data.startTime,
        endTime: data.endTime,
        reason: data.reason,
      },
    });

    const result = {
      ...override,
      date: override.date.toISOString().split('T')[0],
    };
    
    console.log('[StaffService] Override created/updated:', result);
    return result;
  }

  async deleteScheduleOverride(merchantId: string, staffId: string, date: string) {
    // Verify staff belongs to merchant
    const staff = await this.prisma.staff.findFirst({
      where: {
        id: staffId,
        merchantId,
      },
    });

    if (!staff) {
      throw new NotFoundException('Staff member not found');
    }

    try {
      await this.prisma.scheduleOverride.delete({
        where: {
          staffId_date: {
            staffId,
            date: new Date(date),
          },
        },
      });

      return { success: true };
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Schedule override not found');
      }
      throw error;
    }
  }
}