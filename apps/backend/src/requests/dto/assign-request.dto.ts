import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class AssignRequestDto {
  @ApiPropertyOptional({
    example: 'uuid-de-l-agent',
    nullable: true,
    description: "Identifiant de l'agent ou administrateur assigné. Null ou vide désassigne le dossier.",
  })
  @IsOptional()
  @IsUUID()
  instructorId?: string | null;
}
