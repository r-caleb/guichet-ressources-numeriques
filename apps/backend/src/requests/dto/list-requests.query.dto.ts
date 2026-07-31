import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { RequestStatus } from '@prisma/client';

export class ListRequestsQueryDto {
  @ApiPropertyOptional({ example: 'investissements' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: RequestStatus, example: RequestStatus.RECEIVED })
  @IsOptional()
  @IsEnum(RequestStatus)
  status?: RequestStatus;

  @ApiPropertyOptional({ example: 'uuid-du-ministere' })
  @IsOptional()
  @IsUUID()
  ministryId?: string;

  @ApiPropertyOptional({ example: 'uuid-de-l-agent' })
  @IsOptional()
  @IsUUID()
  instructorId?: string;

  @ApiPropertyOptional({
    example: true,
    description: "Limite la liste aux dossiers assignés à l'utilisateur connecté.",
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  assignedToMe?: boolean;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ example: 1, minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20, minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
