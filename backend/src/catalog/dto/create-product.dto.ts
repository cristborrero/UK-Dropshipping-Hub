import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  IsInt,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  sku!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  category!: string;

  @IsNumber()
  @Min(0)
  wholesalePrice!: number;

  @IsInt()
  @Min(0)
  stock!: number;

  @IsInt()
  @Min(1)
  slaDays!: number;
}
