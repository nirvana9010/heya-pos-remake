import {
  Controller,
  Get,
  UseGuards,
  Request,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  ForbiddenException,
} from "@nestjs/common";
import { ReportsService } from "./reports.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Controller("reports")
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get("revenue")
  async getRevenueStats(
    @Request() req: any,
    @Query("locationId") locationId?: string,
  ) {
    const merchantId = req.user.merchantId;
    return this.reportsService.getRevenueStats(merchantId, locationId);
  }

  @Get("bookings")
  async getBookingStats(
    @Request() req: any,
    @Query("locationId") locationId?: string,
  ) {
    const merchantId = req.user.merchantId;
    return this.reportsService.getBookingStats(merchantId, locationId);
  }

  @Get("customers")
  async getCustomerStats(@Request() req: any) {
    const merchantId = req.user.merchantId;
    return this.reportsService.getCustomerStats(merchantId);
  }

  @Get("top-services")
  async getTopServices(
    @Request() req: any,
    @Query("limit", new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    const merchantId = req.user.merchantId;
    return this.reportsService.getTopServices(merchantId, limit);
  }

  @Get("staff-performance")
  async getStaffPerformance(
    @Request() req: any,
    @Query("limit", new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    const merchantId = req.user.merchantId;
    return this.reportsService.getStaffPerformance(merchantId, limit);
  }

  @Get("revenue-trend")
  async getRevenueTrend(
    @Request() req: any,
    @Query("days", new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    const merchantId = req.user.merchantId;
    return this.reportsService.getDailyRevenue(merchantId, days);
  }

  @Get("activity-log")
  async getActivityLog(
    @Request() req: any,
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(25), ParseIntPipe) limit: number,
    @Query("staffId") staffId?: string,
    @Query("action") action?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    // Only owners and managers can view activity log
    const user = req.user;
    const isOwner =
      user.type === "merchant" || (user.permissions || []).includes("*");
    const isManager =
      user.role === "Manager" || user.role === "manager";
    if (!isOwner && !isManager) {
      throw new ForbiddenException("Only owners and managers can view the activity log");
    }

    return this.reportsService.getActivityLog(user.merchantId, {
      page,
      limit,
      staffId,
      action,
      startDate,
      endDate,
    });
  }

  @Get("daily-summary")
  async getDailySummary(
    @Request() req: any,
    @Query("date") date?: string,
    @Query("locationId") locationId?: string,
  ) {
    const merchantId = req.user.merchantId;
    return this.reportsService.getDailySummary(merchantId, date, locationId);
  }

  @Get("overview")
  async getOverview(
    @Request() req: any,
    @Query("locationId") locationId?: string,
  ) {
    const merchantId = req.user.merchantId;

    // Use the clean method that returns properly structured data
    return this.reportsService.getCleanReportOverview(merchantId, locationId);
  }
}
