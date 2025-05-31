import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
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

    // Hash the PIN
    const hashedPin = await bcrypt.hash(createStaffDto.pin, 10);

    // Extract locationIds for separate handling
    const { locationIds, ...staffData } = createStaffDto;

    // Create staff member
    const staff = await this.prisma.staff.create({
      data: {
        ...staffData,
        merchantId,
        pin: hashedPin,
        accessLevel: staffData.accessLevel || 1,
      },
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

    // Return staff without PIN
    const { pin, ...staffWithoutPin } = staff;
    return staffWithoutPin;
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

    // Remove PIN from response
    return staff.map(({ pin, ...staffMember }) => ({
      ...staffMember,
      name: `${staffMember.firstName} ${staffMember.lastName}`,
      isActive: staffMember.status === 'ACTIVE',
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

    // Remove PIN from response
    const { pin, ...staffWithoutPin } = staff;
    return {
      ...staffWithoutPin,
      name: `${staff.firstName} ${staff.lastName}`,
      isActive: staff.status === 'ACTIVE',
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

    // Extract locationIds and newPin for separate handling
    const { locationIds, newPin, ...updateData } = updateStaffDto;

    // Hash new PIN if provided
    if (newPin) {
      updateData['pin'] = await bcrypt.hash(newPin, 10);
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

    // Return updated staff without PIN
    const { pin: _, ...staffWithoutPin } = updatedStaff;
    return {
      ...staffWithoutPin,
      name: `${updatedStaff.firstName} ${updatedStaff.lastName}`,
      isActive: updatedStaff.status === 'ACTIVE',
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
}
