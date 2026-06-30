import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { SuppliersService } from './suppliers.service';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser, Roles } from '../auth/decorators';

@Controller('suppliers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPPLIER)
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get('me')
  async getProfile(@CurrentUser() user: JwtPayload) {
    return this.suppliersService.getProfile(user);
  }

  @Patch('me')
  async updateProfile(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateSupplierDto,
  ) {
    return this.suppliersService.updateProfile(user, dto);
  }
}
