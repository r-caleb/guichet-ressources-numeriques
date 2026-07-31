import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreatePointFocalAccountDto {
  @ApiProperty({
    example: 'PointFocal123!',
    description: "Mot de passe temporaire défini par l'administration et transmis manuellement au Point Focal.",
  })
  @IsString()
  @MinLength(10)
  @MaxLength(120)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/, {
    message: 'Le mot de passe temporaire doit contenir une majuscule, une minuscule, un chiffre et un symbole.',
  })
  password!: string;
}
