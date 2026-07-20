import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength } from 'class-validator';

export class ReceiptRequestDto {
  @ApiProperty({ example: 'DNRN-2026-0007' })
  @IsString()
  @MaxLength(40)
  number!: string;

  @ApiProperty({ example: 'point.focal@example.com' })
  @IsEmail()
  focalEmail!: string;
}
