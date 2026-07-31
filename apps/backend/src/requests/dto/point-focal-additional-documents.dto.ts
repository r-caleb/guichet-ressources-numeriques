import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

function emptyToUndefined(value: unknown) {
  return typeof value === 'string' && value.trim() === '' ? undefined : value;
}

export class PointFocalAdditionalDocumentsDto {
  @ApiPropertyOptional({
    example: 'Veuillez trouver ci-joint la lettre corrigée.',
    description: 'Commentaire facultatif accompagnant les pièces complémentaires.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(600)
  @Transform(({ value }) => emptyToUndefined(value))
  message?: string;
}
