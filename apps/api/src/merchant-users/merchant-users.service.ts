import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  CreateMerchantUserDto,
  UpdateMerchantUserDto,
  InviteMerchantUserDto,
} from "./dto";
import * as bcrypt from "bcrypt";
import { randomBytes } from "crypto";

@Injectable()
export class MerchantUsersService {
  constructor(private prisma: PrismaService) {}

  async create(merchantId: string, dto: CreateMerchantUserDto) {
    // Check if user with this email already exists for this merchant
    const existingUser = await this.prisma.merchantUser.findUnique({
      where: {
        merchantId_email: {
          merchantId,
          email: dto.email.toLowerCase(),
        },
      },
    });

    if (existingUser) {
      throw new ConflictException("A user with this email already exists");
    }

    // Verify role exists and is accessible to this merchant
    const role = await this.validateRole(merchantId, dto.roleId);

    // Verify locations belong to this merchant
    if (dto.locationIds?.length) {
      await this.validateLocations(merchantId, dto.locationIds);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Create user with locations
    const user = await this.prisma.merchantUser.create({
      data: {
        merchantId,
        email: dto.email.toLowerCase(),
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        roleId: dto.roleId,
        locations: dto.locationIds?.length
          ? {
              create: dto.locationIds.map((locationId) => ({
                locationId,
              })),
            }
          : undefined,
      },
      include: {
        role: true,
        locations: {
          include: {
            location: true,
          },
        },
      },
    });

    // Remove sensitive data
    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async invite(merchantId: string, dto: InviteMerchantUserDto) {
    // Check if user with this email already exists for this merchant
    const existingUser = await this.prisma.merchantUser.findUnique({
      where: {
        merchantId_email: {
          merchantId,
          email: dto.email.toLowerCase(),
        },
      },
    });

    if (existingUser) {
      throw new ConflictException("A user with this email already exists");
    }

    // Verify role exists and is accessible to this merchant
    await this.validateRole(merchantId, dto.roleId);

    // Verify locations belong to this merchant
    if (dto.locationIds?.length) {
      await this.validateLocations(merchantId, dto.locationIds);
    }

    // Generate invite token
    const inviteToken = randomBytes(32).toString("hex");
    const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create user with pending status
    const user = await this.prisma.merchantUser.create({
      data: {
        merchantId,
        email: dto.email.toLowerCase(),
        passwordHash: "", // Will be set when user accepts invite
        firstName: dto.firstName,
        lastName: dto.lastName,
        roleId: dto.roleId,
        status: "INACTIVE", // Will be set to ACTIVE when invite is accepted
        invitedAt: new Date(),
        inviteToken,
        inviteExpiresAt,
        locations: dto.locationIds?.length
          ? {
              create: dto.locationIds.map((locationId) => ({
                locationId,
              })),
            }
          : undefined,
      },
      include: {
        role: true,
        merchant: {
          select: {
            name: true,
            subdomain: true,
          },
        },
      },
    });

    // TODO: Send invite email
    // For now, return the invite token (in production, this should be sent via email)
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      inviteToken, // Remove this in production
      inviteExpiresAt,
      merchantName: user.merchant.name,
    };
  }

  async acceptInvite(token: string, password: string) {
    const user = await this.prisma.merchantUser.findUnique({
      where: { inviteToken: token },
      include: {
        role: true,
        merchant: {
          select: {
            id: true,
            name: true,
            subdomain: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException("Invalid or expired invite token");
    }

    if (user.inviteExpiresAt && user.inviteExpiresAt < new Date()) {
      throw new BadRequestException("Invite has expired");
    }

    if (user.status === "ACTIVE") {
      throw new BadRequestException("Invite has already been accepted");
    }

    // Hash password and activate user
    const passwordHash = await bcrypt.hash(password, 10);

    const updatedUser = await this.prisma.merchantUser.update({
      where: { id: user.id },
      data: {
        passwordHash,
        status: "ACTIVE",
        inviteToken: null,
        inviteExpiresAt: null,
      },
      include: {
        role: true,
        locations: {
          include: {
            location: true,
          },
        },
      },
    });

    const { passwordHash: _, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  async findAll(merchantId: string, status?: string) {
    const users = await this.prisma.merchantUser.findMany({
      where: {
        merchantId,
        ...(status && { status }),
      },
      include: {
        role: true,
        locations: {
          include: {
            location: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Remove password hashes
    return users.map(({ passwordHash, inviteToken, ...user }) => user);
  }

  async findOne(merchantId: string, id: string) {
    const user = await this.prisma.merchantUser.findFirst({
      where: {
        id,
        merchantId,
      },
      include: {
        role: true,
        locations: {
          include: {
            location: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const { passwordHash, inviteToken, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async findByEmail(merchantId: string, email: string) {
    return this.prisma.merchantUser.findUnique({
      where: {
        merchantId_email: {
          merchantId,
          email: email.toLowerCase(),
        },
      },
      include: {
        role: true,
        locations: {
          include: {
            location: true,
          },
        },
        merchant: {
          include: {
            locations: {
              where: { isActive: true },
            },
            package: true,
          },
        },
      },
    });
  }

  async update(merchantId: string, id: string, dto: UpdateMerchantUserDto) {
    // Verify user exists and belongs to merchant
    const existingUser = await this.prisma.merchantUser.findFirst({
      where: { id, merchantId },
    });

    if (!existingUser) {
      throw new NotFoundException("User not found");
    }

    // Check last-owner protection
    const ownerRole = await this.getOwnerRole();
    if (ownerRole && existingUser.roleId === ownerRole.id) {
      // User is currently an owner
      const isBeingDemoted = dto.roleId && dto.roleId !== ownerRole.id;
      const isBeingDeactivated =
        dto.status &&
        dto.status !== "ACTIVE" &&
        existingUser.status === "ACTIVE";

      if (isBeingDemoted || isBeingDeactivated) {
        // Check if there are other active owners
        const otherActiveOwners = await this.prisma.merchantUser.count({
          where: {
            merchantId,
            roleId: ownerRole.id,
            status: "ACTIVE",
            id: { not: id },
          },
        });

        if (otherActiveOwners === 0) {
          const errorType = isBeingDemoted
            ? "LAST_OWNER_ROLE_CHANGE"
            : "LAST_OWNER_STATUS_CHANGE";
          throw new BadRequestException({
            statusCode: 400,
            error: errorType,
            message: isBeingDemoted
              ? "Cannot change role of the last owner. Assign another owner first."
              : "Cannot deactivate the last owner. Assign another owner first.",
          });
        }
      }
    }

    // Check for email uniqueness if changing email
    if (dto.email && dto.email.toLowerCase() !== existingUser.email) {
      const emailExists = await this.prisma.merchantUser.findUnique({
        where: {
          merchantId_email: {
            merchantId,
            email: dto.email.toLowerCase(),
          },
        },
      });

      if (emailExists) {
        throw new ConflictException("A user with this email already exists");
      }
    }

    // Verify role if changing
    if (dto.roleId) {
      await this.validateRole(merchantId, dto.roleId);
    }

    // Verify locations if changing
    if (dto.locationIds) {
      await this.validateLocations(merchantId, dto.locationIds);
    }

    // Prepare update data
    const updateData: any = {
      ...(dto.email && { email: dto.email.toLowerCase() }),
      ...(dto.firstName && { firstName: dto.firstName }),
      ...(dto.lastName !== undefined && { lastName: dto.lastName }),
      ...(dto.roleId && { roleId: dto.roleId }),
      ...(dto.status && { status: dto.status }),
    };

    // Hash password if provided
    if (dto.password) {
      updateData.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    // Update user
    const user = await this.prisma.merchantUser.update({
      where: { id },
      data: updateData,
      include: {
        role: true,
        locations: {
          include: {
            location: true,
          },
        },
      },
    });

    // Update locations if provided
    if (dto.locationIds !== undefined) {
      // Delete existing locations
      await this.prisma.merchantUserLocation.deleteMany({
        where: { userId: id },
      });

      // Create new locations
      if (dto.locationIds.length > 0) {
        await this.prisma.merchantUserLocation.createMany({
          data: dto.locationIds.map((locationId) => ({
            userId: id,
            locationId,
          })),
        });
      }

      // Refetch with updated locations
      const updatedUser = await this.prisma.merchantUser.findUnique({
        where: { id },
        include: {
          role: true,
          locations: {
            include: {
              location: true,
            },
          },
        },
      });

      const { passwordHash, inviteToken, ...userWithoutPassword } =
        updatedUser!;
      return userWithoutPassword;
    }

    const { passwordHash, inviteToken, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async remove(merchantId: string, id: string) {
    // Verify user exists and belongs to merchant
    const existingUser = await this.prisma.merchantUser.findFirst({
      where: { id, merchantId },
    });

    if (!existingUser) {
      throw new NotFoundException("User not found");
    }

    // Check last-owner protection
    const ownerRole = await this.getOwnerRole();
    if (ownerRole && existingUser.roleId === ownerRole.id) {
      // Check if there are other active owners
      const otherActiveOwners = await this.prisma.merchantUser.count({
        where: {
          merchantId,
          roleId: ownerRole.id,
          status: "ACTIVE",
          id: { not: id },
        },
      });

      if (otherActiveOwners === 0) {
        throw new BadRequestException({
          statusCode: 400,
          error: "LAST_OWNER_DELETE",
          message: "Cannot delete the last owner. Assign another owner first.",
        });
      }
    }

    await this.prisma.merchantUser.delete({
      where: { id },
    });

    return { success: true };
  }

  // Role management
  async findAllRoles(merchantId: string) {
    // Get active system roles (merchantId is null, isSystem=true) and merchant-specific roles
    return this.prisma.merchantRole.findMany({
      where: {
        OR: [
          { merchantId: null, isSystem: true }, // Only active system roles
          { merchantId }, // Merchant-specific roles
        ],
      },
      orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    });
  }

  async createRole(
    merchantId: string,
    data: { name: string; description?: string; permissions: string[] },
  ) {
    // Check if role name already exists for this merchant
    const existingRole = await this.prisma.merchantRole.findUnique({
      where: {
        merchantId_name: {
          merchantId,
          name: data.name,
        },
      },
    });

    if (existingRole) {
      throw new ConflictException("A role with this name already exists");
    }

    return this.prisma.merchantRole.create({
      data: {
        merchantId,
        name: data.name,
        description: data.description,
        permissions: data.permissions,
        isSystem: false,
      },
    });
  }

  async updateRole(
    merchantId: string,
    roleId: string,
    data: { name?: string; description?: string; permissions?: string[] },
  ) {
    const role = await this.prisma.merchantRole.findFirst({
      where: {
        id: roleId,
        merchantId, // Can only update merchant-specific roles
      },
    });

    if (!role) {
      throw new NotFoundException("Role not found or cannot be modified");
    }

    if (role.isSystem) {
      throw new BadRequestException("System roles cannot be modified");
    }

    return this.prisma.merchantRole.update({
      where: { id: roleId },
      data,
    });
  }

  async deleteRole(merchantId: string, roleId: string) {
    const role = await this.prisma.merchantRole.findFirst({
      where: {
        id: roleId,
        merchantId,
      },
    });

    if (!role) {
      throw new NotFoundException("Role not found");
    }

    if (role.isSystem) {
      throw new BadRequestException("System roles cannot be deleted");
    }

    // Check if any users are using this role
    const usersWithRole = await this.prisma.merchantUser.count({
      where: { roleId },
    });

    if (usersWithRole > 0) {
      throw new BadRequestException(
        "Cannot delete role that is assigned to users",
      );
    }

    await this.prisma.merchantRole.delete({
      where: { id: roleId },
    });

    return { success: true };
  }

  // Helper methods
  private async getOwnerRole() {
    return this.prisma.merchantRole.findFirst({
      where: { merchantId: null, isSystem: true, permissions: { has: "*" } },
      select: { id: true },
    });
  }

  private async validateRole(merchantId: string, roleId: string) {
    const role = await this.prisma.merchantRole.findFirst({
      where: {
        id: roleId,
        OR: [{ merchantId: null }, { merchantId }],
      },
    });

    if (!role) {
      throw new BadRequestException("Invalid role");
    }

    return role;
  }

  private async validateLocations(merchantId: string, locationIds: string[]) {
    const locations = await this.prisma.location.findMany({
      where: {
        id: { in: locationIds },
        merchantId,
      },
    });

    if (locations.length !== locationIds.length) {
      throw new BadRequestException("One or more locations are invalid");
    }

    return locations;
  }
}
