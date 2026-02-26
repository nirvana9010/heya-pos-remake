import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from "@nestjs/common";
import { StaffService } from "./staff.service";
import { CreateStaffDto } from "./dto/create-staff.dto";
import { UpdateStaffDto } from "./dto/update-staff.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { Permissions } from "../auth/decorators/permissions.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";

@Controller("staff")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Post()
  @Permissions("staff.create")
  create(@CurrentUser() user: any, @Body() createStaffDto: CreateStaffDto) {
    return this.staffService.create(user.merchantId, createStaffDto);
  }

  @Get()
  @Permissions("staff.view")
  findAll(@CurrentUser() user: any, @Query("active") active?: string) {
    const isActive =
      active === "true" ? true : active === "false" ? false : undefined;
    return this.staffService.findAll(user.merchantId, isActive);
  }

  @Get("schedules")
  @Permissions("staff.view")
  getAllSchedules(@CurrentUser() user: any) {
    return this.staffService.getAllSchedules(user.merchantId);
  }

  @Get(":id")
  @Permissions("staff.view")
  findOne(@CurrentUser() user: any, @Param("id") id: string) {
    return this.staffService.findOne(user.merchantId, id);
  }

  @Patch(":id")
  @Permissions("staff.update")
  update(
    @CurrentUser() user: any,
    @Param("id") id: string,
    @Body() updateStaffDto: UpdateStaffDto,
  ) {
    return this.staffService.update(user.merchantId, id, updateStaffDto);
  }

  @Delete(":id")
  @Permissions("staff.delete")
  remove(
    @CurrentUser() user: any,
    @Param("id") id: string,
    @Query("hard") hard?: string,
  ) {
    // Add hard delete option with ?hard=true query parameter
    if (hard === "true") {
      return this.staffService.hardRemove(user.merchantId, id);
    }
    return this.staffService.remove(user.merchantId, id);
  }

  @Get(":id/schedule")
  @Permissions("staff.view")
  getSchedule(@CurrentUser() user: any, @Param("id") id: string) {
    return this.staffService.getSchedule(user.merchantId, id);
  }

  @Post(":id/schedule")
  @Permissions("staff.update")
  updateSchedule(
    @CurrentUser() user: any,
    @Param("id") id: string,
    @Body()
    schedule: {
      schedules: Array<{
        dayOfWeek: number;
        startTime: string;
        endTime: string;
      }>;
    },
  ) {
    return this.staffService.updateSchedule(user.merchantId, id, schedule);
  }

  @Post(":id/schedule/default")
  @Permissions("staff.update")
  async createDefaultSchedule(
    @CurrentUser() user: any,
    @Param("id") id: string,
  ) {
    // First delete any existing schedules for this staff member
    await this.staffService.updateSchedule(user.merchantId, id, {
      schedules: [],
    });
    // Then create default schedules from business hours
    await this.staffService.createDefaultSchedules(id, user.merchantId);
    // Return the new schedule
    return this.staffService.getSchedule(user.merchantId, id);
  }

  @Get(":id/overrides")
  @Permissions("staff.view")
  getScheduleOverrides(
    @CurrentUser() user: any,
    @Param("id") id: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    return this.staffService.getScheduleOverrides(
      user.merchantId,
      id,
      startDate,
      endDate,
    );
  }

  @Post(":id/overrides")
  @Permissions("staff.update")
  createOrUpdateScheduleOverride(
    @CurrentUser() user: any,
    @Param("id") id: string,
    @Body()
    override: {
      date: string;
      startTime: string | null;
      endTime: string | null;
      reason?: string;
    },
  ) {
    return this.staffService.createOrUpdateScheduleOverride(
      user.merchantId,
      id,
      override,
    );
  }

  @Delete(":id/overrides/:date")
  @Permissions("staff.update")
  deleteScheduleOverride(
    @CurrentUser() user: any,
    @Param("id") id: string,
    @Param("date") date: string,
  ) {
    return this.staffService.deleteScheduleOverride(user.merchantId, id, date);
  }
}
