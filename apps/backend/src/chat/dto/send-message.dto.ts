import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

function emptyToUndefined(value: unknown) {
  return typeof value === 'string' && value.trim() === '' ? undefined : value;
}

export class SendMessageDto {
  @ApiPropertyOptional({
    example: 'Bonjour, veuillez trouver ci-joint le document demandé.',
    description: 'Texte du message. Facultatif si au moins une pièce jointe est transmise.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  @Transform(({ value }) => emptyToUndefined(value))
  body?: string;
}
