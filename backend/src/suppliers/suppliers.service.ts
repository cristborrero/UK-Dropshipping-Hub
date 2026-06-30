import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { UserRole, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { JwtPayload } from '../auth/guards/jwt-auth.guard';

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(user: JwtPayload) {
    if (user.role !== UserRole.SUPPLIER) {
      throw new ForbiddenException('Only suppliers can access this resource');
    }

    const supplier = await this.prisma.supplier.findUnique({
      where: { userId: user.sub },
      include: {
        user: {
          select: {
            email: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    if (!supplier) {
      throw new NotFoundException('Supplier profile not found');
    }

    return supplier;
  }

  async updateProfile(user: JwtPayload, dto: UpdateSupplierDto) {
    if (user.role !== UserRole.SUPPLIER) {
      throw new ForbiddenException('Only suppliers can access this resource');
    }

    const supplier = await this.prisma.supplier.findUnique({
      where: { userId: user.sub },
    });

    if (!supplier) {
      throw new NotFoundException('Supplier profile not found');
    }

    // Update supplier profile and activate if all required fields are present
    const isComplete = dto.companyName && dto.vat && dto.address;

    const updated = await this.prisma.supplier.update({
      where: { id: supplier.id },
      data: {
        companyName: dto.companyName,
        vat: dto.vat,
        address: dto.address,
        categories: dto.categories ?? supplier.categories,
        shippingSla: dto.shippingSla ?? supplier.shippingSla,
        ...(isComplete && supplier.status === UserStatus.PENDING
          ? { status: UserStatus.ACTIVE }
          : {}),
      },
    });

    // Also activate the User record if supplier is now active
    if (isComplete && supplier.status === UserStatus.PENDING) {
      await this.prisma.user.update({
        where: { id: user.sub },
        data: { status: UserStatus.ACTIVE },
      });
    }

    return updated;
  }
}
