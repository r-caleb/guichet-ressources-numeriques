import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreatePointFocalAccountDto {
  @ApiProperty({
    example: 'PointFocal123!',
    description: "Mot de passe temporaire défini par l'administration et transmis manuellement au Point Focal.",
  })
  @IsString()
  @MinLength(8)
  @MaxLength(120)
  password!: string;
}
