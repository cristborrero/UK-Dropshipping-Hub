import { IsString, IsOptional, IsNumber, Min, IsInt } from 'class-validator';

export class UpdateProductDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  wholesalePrice?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  stock?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  slaDays?: number;
}
