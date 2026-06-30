import { IsEnum, IsString, IsOptional, IsNotEmpty } from 'class-validator';
import { OrderStatus } from '@prisma/client';

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status!: OrderStatus;

  @IsString()
  @IsOptional()
  @IsNotEmpty()
  carrier?: string;

  @IsString()
  @IsOptional()
  @IsNotEmpty()
  trackingCode?: string;
}
