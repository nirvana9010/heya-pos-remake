import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TimezoneUtils } from '@heya-pos/utils';

@Injectable()
export class LocationsService {
  constructor(private prisma: PrismaService) {}

  async findAll(merchantId: string) {
    return this.prisma.location.findMany({
      where: { merchantId },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(merchantId: string, id: string) {
    const location = await this.prisma.location.findFirst({
      where: { id, merchantId },
    });

    if (!location) {
      throw new NotFoundException('Location not found');
    }

    return location;
  }

  async updateTimezone(merchantId: string, id: string, timezone: string) {
    // Validate timezone
    if (!TimezoneUtils.isValidTimezone(timezone)) {
      throw new BadRequestException('Invalid timezone');
    }

    const location = await this.findOne(merchantId, id);

    return this.prisma.location.update({
      where: { id },
      data: { timezone },
    });
  }

  async update(merchantId: string, id: string, data: any) {
    await this.findOne(merchantId, id);

    // If timezone is being updated, validate it
    if (data.timezone && !TimezoneUtils.isValidTimezone(data.timezone)) {
      throw new BadRequestException('Invalid timezone');
    }

    return this.prisma.location.update({
      where: { id },
      data,
    });
  }
}