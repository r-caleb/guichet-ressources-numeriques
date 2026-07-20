import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { AudienceType, CriticalityLevel, PlatformType, RequestType } from '@prisma/client';

function emptyToUndefined(value: unknown) {
  return value === '' ? undefined : value;
}

function parseArray(value: unknown) {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return value;

  const trimmed = value.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith('[')) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return [trimmed];
    }
  }

  return trimmed.split(',').map((item) => item.trim()).filter(Boolean);
}

function normalizePrefix(value: unknown) {
  if (typeof value !== 'string') return value;

  return value
    .trim()
    .toLowerCase()
    .replace(/\.gouv\.cd$/i, '');
}

export class CreateResourceRequestDto {
  @ApiProperty({ example: 'Kabila' })
  @IsString()
  @MaxLength(80)
  focalLastName!: string;

  @ApiProperty({ example: 'Kabange' })
  @IsString()
  @MaxLength(80)
  focalMiddleName!: string;

  @ApiProperty({ example: 'Jean' })
  @IsString()
  @MaxLength(80)
  focalFirstName!: string;

  @ApiProperty({ example: 'Point Focal Numérique' })
  @IsString()
  @MaxLength(120)
  focalFunction!: string;

  @ApiProperty({ example: 'Direction des systèmes d’information' })
  @IsString()
  @MaxLength(120)
  focalDepartment!: string;

  @ApiProperty({ example: '+243820112385' })
  @IsString()
  @MaxLength(40)
  focalPhone!: string;

  @ApiProperty({ example: 'point.focal@example.com' })
  @IsEmail()
  focalEmail!: string;

  @ApiProperty({ example: 'uuid-du-ministere' })
  @IsUUID()
  ministryId!: string;

  @ApiProperty({
    enum: RequestType,
    isArray: true,
    example: [RequestType.GOVERNMENT_SUBDOMAIN],
    description: 'En multipart, envoyer un tableau JSON ou une liste séparée par virgules.',
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(RequestType, { each: true })
  @Transform(({ value }) => parseArray(value))
  requestTypes!: RequestType[];

  @ApiPropertyOptional({ example: 'Demande liée au lancement d’un nouveau portail.' })
  @IsOptional()
  @IsString()
  @MaxLength(800)
  @Transform(({ value }) => emptyToUndefined(value))
  requestDetails?: string;

  @ApiProperty({ example: 'Portail des investissements' })
  @IsString()
  @MaxLength(180)
  platformName!: string;

  @ApiProperty({ enum: PlatformType, example: PlatformType.SERVICE_PORTAL })
  @IsEnum(PlatformType)
  platformType!: PlatformType;

  @ApiProperty({ enum: AudienceType, example: AudienceType.CITIZENS })
  @IsEnum(AudienceType)
  audience!: AudienceType;

  @ApiProperty({ enum: CriticalityLevel, example: CriticalityLevel.NORMAL })
  @IsEnum(CriticalityLevel)
  criticality!: CriticalityLevel;

  @ApiPropertyOptional({ example: 'https://ancienne-plateforme.gouv.cd' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Transform(({ value }) => emptyToUndefined(value))
  existingUrl?: string;

  @ApiPropertyOptional({ example: '2026-08-01' })
  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => emptyToUndefined(value))
  targetDate?: string;

  @ApiProperty({
    example:
      'Cette plateforme permettra aux citoyens et entreprises de consulter les informations officielles liées aux investissements.',
  })
  @IsString()
  @MinLength(10)
  @MaxLength(1600)
  officialPurpose!: string;

  @ApiPropertyOptional({ example: 'Jean Kabila, +243820112385, jean@example.com' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  @Transform(({ value }) => emptyToUndefined(value))
  technicalContact?: string;

  @ApiProperty({ example: 'investissements', description: 'Préfixe souhaité sans .gouv.cd' })
  @IsString()
  @MinLength(3)
  @MaxLength(63)
  @Matches(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])$/)
  @Transform(({ value }) => normalizePrefix(value))
  prefix1!: string;

  @ApiPropertyOptional({ example: 'portail-investissements', description: 'Alternative optionnelle sans .gouv.cd' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(63)
  @Matches(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])$/)
  @Transform(({ value }) => emptyToUndefined(normalizePrefix(value)))
  prefix2?: string;

  @ApiPropertyOptional({ example: 'investir-rdc', description: 'Alternative optionnelle sans .gouv.cd' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(63)
  @Matches(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])$/)
  @Transform(({ value }) => emptyToUndefined(normalizePrefix(value)))
  prefix3?: string;
}
