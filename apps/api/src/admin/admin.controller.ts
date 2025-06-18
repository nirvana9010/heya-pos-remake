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
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { JwtService } from '@nestjs/jwt';

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
}

interface AdminLoginDto {
  username: string;
  password: string;
}

@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly jwtService: JwtService,
  ) {}

  // Temporary admin login - in production, use proper admin auth
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: AdminLoginDto) {
    // Hardcoded admin credentials for testing
    if (dto.username === 'admin' && dto.password === 'admin123') {
      const payload = {
        id: 'admin-1',
        username: 'admin',
        email: 'admin@heya-pos.com',
        role: 'SUPER_ADMIN',
      };
      
      return {
        token: this.jwtService.sign(payload),
        user: payload,
      };
    }
    
    throw new UnauthorizedException('Invalid credentials');
  }

  // For now, this is unprotected for testing
  // In production, this should require super-admin authentication
  @Post('merchants')
  @HttpCode(HttpStatus.CREATED)
  async createMerchant(@Body() dto: CreateMerchantDto) {
    return this.adminService.createMerchant(dto);
  }

  @Get('merchants')
  async listMerchants() {
    return this.adminService.listMerchants();
  }

  @Get('merchants/:id')
  async getMerchant(@Param('id') id: string) {
    return this.adminService.getMerchant(id);
  }

  @Patch('merchants/:id')
  async updateMerchant(@Param('id') id: string, @Body() dto: Partial<CreateMerchantDto>) {
    return this.adminService.updateMerchant(id, dto);
  }

  @Delete('merchants/:id')
  async deleteMerchant(@Param('id') id: string) {
    return this.adminService.deleteMerchant(id);
  }

  @Get('check-subdomain')
  async checkSubdomain(@Query('subdomain') subdomain: string) {
    const available = await this.adminService.checkSubdomainAvailability(subdomain);
    return { available };
  }

  @Get('check-username')
  async checkUsername(@Query('username') username: string) {
    const available = await this.adminService.checkUsernameAvailability(username);
    return { available };
  }

  @Get('packages')
  async getPackages() {
    return this.adminService.getPackages();
  }
}