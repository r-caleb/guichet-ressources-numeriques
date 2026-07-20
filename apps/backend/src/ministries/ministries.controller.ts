import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateMinistryDto } from './dto/create-ministry.dto';
import { MinistriesService } from './ministries.service';

@ApiTags('Ministères')
@Controller('ministries')
export class MinistriesController {
  constructor(private readonly ministries: MinistriesService) {}

  @Get()
  @ApiOperation({
    summary: 'Lister les ministères actifs',
    description: 'Retourne les ministères et institutions disponibles dans le formulaire public de demande.',
  })
  listActive() {
    return this.ministries.listActive();
  }

  @Post()
  @ApiOperation({
    summary: 'Créer un ministère',
    description: 'Ajoute un ministère ou une institution publique pouvant soumettre des demandes.',
  })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  create(@Body() dto: CreateMinistryDto) {
    return this.ministries.create(dto);
  }
}
