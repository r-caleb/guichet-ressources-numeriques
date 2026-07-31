import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class ResetUserPasswordDto {
  @ApiProperty({ example: 'NouveauMotDePasse123!' })
  @IsString()
  @MinLength(10)
  @MaxLength(120)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/, {
    message: 'Le mot de passe doit contenir une majuscule, une minuscule, un chiffre et un symbole.',
  })
  password!: string;
}
