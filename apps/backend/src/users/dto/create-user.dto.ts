import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsEmail, IsEnum, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { UserRole } from '@prisma/client';

export class CreateUserDto {
  @ApiProperty({ example: 'agent@economienumerique.gouv.cd' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Agent12345!' })
  @IsString()
  @MinLength(10)
  @MaxLength(120)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/, {
    message: 'Le mot de passe doit contenir une majuscule, une minuscule, un chiffre et un symbole.',
  })
  password!: string;

  @ApiProperty({ example: 'Jean' })
  @IsString()
  @MaxLength(80)
  firstName!: string;

  @ApiProperty({ example: 'Kabila' })
  @IsString()
  @MaxLength(80)
  lastName!: string;

  @ApiPropertyOptional({ example: '+243820112385' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @ApiPropertyOptional({ enum: UserRole, isArray: true, example: [UserRole.AGENT] })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(UserRole, { each: true })
  roles?: UserRole[];
}
