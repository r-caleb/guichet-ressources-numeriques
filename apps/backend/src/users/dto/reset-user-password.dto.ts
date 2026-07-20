import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class ResetUserPasswordDto {
  @ApiProperty({ example: 'NouveauMotDePasse123!' })
  @IsString()
  @MinLength(8)
  @MaxLength(120)
  password!: string;
}
