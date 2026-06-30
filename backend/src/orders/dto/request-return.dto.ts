import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class RequestReturnDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(5, { message: 'Reason must be at least 5 characters long' })
  reason!: string;
}
