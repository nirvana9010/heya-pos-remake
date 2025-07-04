import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class StaffService {
  constructor(private prisma: PrismaService) {}

  async create(merchantId: string, createStaffDto: CreateStaffDto) {
    // Check if email already exists
    const existingStaff = await this.prisma.staff.findUnique({
      where: { email: createStaffDto.email },
    });

    if (existingStaff) {
      throw new ConflictException('Staff member with this email already exists');
    }

    // Validate PIN format
    if (!/^\d{4}$/.test(createStaffDto.pin)) {
      throw new BadRequestException('PIN must be exactly 4 digits');
    }

    // Hash the PIN
    const hashedPin = await bcrypt.hash(createStaffDto.pin, 10);

    // Extract fields for separate handling or removal
    const { locationIds, role, permissions, ...staffData } = createStaffDto;

    // Create clean data object without unwanted fields
    const createData = {
      firstName: staffData.firstName,
      lastName: staffData.lastName,
      email: staffData.email,
      phone: staffData.phone,
      accessLevel: staffData.accessLevel || 1,
      calendarColor: staffData.calendarColor,
      merchantId,
      pin: hashedPin,
    };

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

    // Return staff WITH PIN (plain text) for display to managers
    const { pin, ...staffWithoutPin } = staff;
    return {
      ...staffWithoutPin,
      pin: createStaffDto.pin, // Return the plain text PIN for display
      name: `${staff.firstName} ${staff.lastName}`,
      isActive: staff.status === 'ACTIVE',
    };
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
      name: `${staffMember.firstName} ${staffMember.lastName}`,
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
      name: `${staff.firstName} ${staff.lastName}`,
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
      name: `${staffMember.firstName} ${staffMember.lastName}`,
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
}