import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Matches } from 'class-validator';

export class TrackRequestDto {
  @ApiProperty({ example: 'DNRN-2026-0001' })
  @IsString()
  @Matches(/^DNRN-\d{4}-\d{4}$/)
  number!: string;

  @ApiProperty({ example: 'point.focal@example.com' })
  @IsEmail()
  focalEmail!: string;
}
