import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
} from 'class-validator';
import { UserRole, StorePlatform } from '@prisma/client';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsEnum(UserRole, { message: 'role must be SUPPLIER or SELLER' })
  role!: UserRole;

  // ── Supplier-specific fields (required when role=SUPPLIER) ──
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  companyName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  vat?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  address?: string;

  // ── Seller-specific fields (required when role=SELLER) ──
  @IsOptional()
  @IsEnum(StorePlatform)
  storePlatform?: StorePlatform;

  @IsOptional()
  @IsUrl()
  storeUrl?: string;
}
