import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ example: 'AncienMotDePasse123!' })
  @IsString()
  @MinLength(8)
  currentPassword!: string;

  @ApiProperty({ example: 'NouveauMotDePasse123!' })
  @IsString()
  @MinLength(10)
  newPassword!: string;

  @ApiProperty({ example: 'NouveauMotDePasse123!' })
  @IsString()
  @MinLength(10)
  confirmPassword!: string;
}
