import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CheckDomainQueryDto {
  @ApiProperty({ example: 'economie', description: 'Préfixe sans .gouv.cd' })
  @IsString()
  @MinLength(3)
  @MaxLength(63)
  @Matches(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])$/)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase().replace(/\.gouv\.cd$/i, '') : value,
  )
  prefix!: string;
}
