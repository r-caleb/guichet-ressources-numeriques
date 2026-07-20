import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { AccessTransmissionMode, RequestStatus } from '@prisma/client';

export class UpdateRequestStatusDto {
  @ApiProperty({ enum: RequestStatus, example: RequestStatus.UNDER_REVIEW })
  @IsEnum(RequestStatus)
  status!: RequestStatus;

  @ApiPropertyOptional({ example: 'Dossier complet, en cours d’analyse.' })
  @IsOptional()
  @IsString()
  @MaxLength(1200)
  administrativeNotes?: string;

  @ApiPropertyOptional({
    example: 'Veuillez transmettre une lettre de désignation plus lisible.',
    description: 'Observation visible par le Point Focal dans le suivi public.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1200)
  publicObservation?: string;

  @ApiPropertyOptional({ example: 'Le domaine demandé ne respecte pas les règles de nommage.' })
  @IsOptional()
  @IsString()
  @MaxLength(1200)
  rejectionReason?: string;

  @ApiPropertyOptional({ example: 'investissements.gouv.cd' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  assignedDomain?: string;

  @ApiPropertyOptional({ enum: AccessTransmissionMode, example: AccessTransmissionMode.OFFICIAL_LETTER })
  @IsOptional()
  @IsEnum(AccessTransmissionMode)
  accessTransmissionMode?: AccessTransmissionMode;
}
