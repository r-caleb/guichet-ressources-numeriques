import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsEmail, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { UserRole } from '@prisma/client';

export class CreateUserDto {
  @ApiProperty({ example: 'agent@economienumerique.gouv.cd' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Agent12345!' })
  @IsString()
  @MinLength(8)
  @MaxLength(120)
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
