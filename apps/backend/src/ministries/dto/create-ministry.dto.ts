import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength, Matches } from 'class-validator';

export class CreateMinistryDto {
  @ApiProperty({ example: "Ministère de l'Économie Numérique" })
  @IsString()
  @MaxLength(160)
  name!: string;

  @ApiPropertyOptional({ example: 'MEN' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  shortName?: string;

  @ApiPropertyOptional({ example: 'economienumerique.gouv.cd' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Matches(/^[a-z0-9.-]+$/)
  officialEmailDomain?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
