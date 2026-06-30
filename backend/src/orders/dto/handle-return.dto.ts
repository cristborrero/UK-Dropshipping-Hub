import { IsEnum, IsNotEmpty } from 'class-validator';

export class HandleReturnDto {
  @IsEnum(['APPROVE', 'REJECT'], {
    message: 'decision must be APPROVE or REJECT',
  })
  @IsNotEmpty()
  decision!: 'APPROVE' | 'REJECT';
}
