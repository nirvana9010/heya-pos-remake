import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  Query,
  Patch,
  Param,
  Delete,
} from "@nestjs/common";
import { AdminService } from "./admin.service";
import { AdminAuthGuard } from "./admin-auth.guard";
import { JwtService } from "@nestjs/jwt";

interface CreateMerchantDto {
  name: string;
  email: string;
  phone: string;
  subdomain: string;
  username: string;
  password: string;
  packageId: string;
  abn?: string;
  packageName?: string;
  address?: string;
  suburb?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  skipTrial?: boolean;
}

interface UpdateMerchantDto {
  name?: string;
  email?: string;
  phone?: string;
  subdomain?: string;
  packageId?: string;
  abn?: string;
  isActive?: boolean;
  subscriptionStatus?: string;
  trialEndsAt?: Date | null;
  skipTrial?: boolean;
}

interface AdminLoginDto {
  username: string;
  password: string;
}

@Controller("admin")
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly jwtService: JwtService,
  ) {}

  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: AdminLoginDto) {
    const adminUser = process.env.ADMIN_USERNAME;
    const adminPass = process.env.ADMIN_PASSWORD;

    if (!adminUser || !adminPass) {
      throw new UnauthorizedException(
        "Admin login is not configured",
      );
    }

    if (dto.username === adminUser && dto.password === adminPass) {
      const payload = {
        id: "admin-1",
        username: adminUser,
        email: "admin@heya-pos.com",
        role: "SUPER_ADMIN",
      };

      return {
        token: this.jwtService.sign(payload),
        user: payload,
      };
    }

    throw new UnauthorizedException("Invalid credentials");
  }

  @Post("merchants")
  @UseGuards(AdminAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createMerchant(@Body() dto: CreateMerchantDto) {
    return this.adminService.createMerchant(dto);
  }

  @Get("merchants")
  @UseGuards(AdminAuthGuard)
  async listMerchants() {
    return this.adminService.listMerchants();
  }

  @Get("merchants/:id")
  @UseGuards(AdminAuthGuard)
  async getMerchant(@Param("id") id: string) {
    return this.adminService.getMerchant(id);
  }

  @Patch("merchants/:id")
  @UseGuards(AdminAuthGuard)
  async updateMerchant(
    @Param("id") id: string,
    @Body() dto: UpdateMerchantDto,
  ) {
    return this.adminService.updateMerchant(id, dto);
  }

  @Delete("merchants/:id")
  @UseGuards(AdminAuthGuard)
  async deleteMerchant(@Param("id") id: string) {
    return this.adminService.deleteMerchant(id);
  }

  @Get("check-subdomain")
  @UseGuards(AdminAuthGuard)
  async checkSubdomain(@Query("subdomain") subdomain: string) {
    const available =
      await this.adminService.checkSubdomainAvailability(subdomain);
    return { available };
  }

  @Get("packages")
  @UseGuards(AdminAuthGuard)
  async getPackages() {
    return this.adminService.getPackages();
  }
}
