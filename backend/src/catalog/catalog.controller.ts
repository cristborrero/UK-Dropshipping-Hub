import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserRole } from '@prisma/client';
import { CatalogService } from './catalog.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser, Roles } from '../auth/decorators';

@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPPLIER)
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Post()
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateProductDto) {
    return this.catalogService.create(user, dto);
  }

  @Get()
  async findAll(@CurrentUser() user: JwtPayload) {
    return this.catalogService.findAll(user);
  }

  @Get(':id')
  async findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.catalogService.findOne(user, id);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.catalogService.update(user, id, dto);
  }

  @Delete(':id')
  async deactivate(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.catalogService.deactivate(user, id);
  }

  @Post('upload-csv')
  @UseInterceptors(FileInterceptor('file'))
  async uploadCsv(@CurrentUser() user: JwtPayload, @UploadedFile() file?: any) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return this.catalogService.uploadCsv(user, file.buffer);
  }
}
