import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsInt,
  Min,
} from 'class-validator';

export class UpdateSupplierDto {
  @IsString()
  @IsNotEmpty()
  companyName!: string;

  @IsString()
  @IsNotEmpty()
  vat!: string;

  @IsString()
  @IsNotEmpty()
  address!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  shippingSla?: number;
}
