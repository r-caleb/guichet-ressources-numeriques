import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UpdateMinistryDto } from './dto/update-ministry.dto';
import { UpdateMinistryStatusDto } from './dto/update-ministry-status.dto';
import { MinistriesService } from './ministries.service';

@ApiTags('Administration - Ministères')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('admin/ministries')
export class AdminMinistriesController {
  constructor(private readonly ministries: MinistriesService) {}

  @Get()
  @ApiOperation({
    summary: 'Lister tous les ministères',
    description: 'Retourne tous les ministères, y compris ceux désactivés dans le back-office.',
  })
  listAll() {
    return this.ministries.listAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: "Consulter un ministère",
    description: "Retourne le détail d'un ministère ou d'une institution publique.",
  })
  findOne(@Param('id') id: string) {
    return this.ministries.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Modifier un ministère',
    description: "Met à jour le nom, le sigle, le domaine email officiel ou l'état actif d'un ministère.",
  })
  update(@Param('id') id: string, @Body() dto: UpdateMinistryDto) {
    return this.ministries.update(id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Activer ou désactiver un ministère',
    description: 'Désactive un ministère sans supprimer son historique de demandes.',
  })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateMinistryStatusDto) {
    return this.ministries.updateStatus(id, dto.isActive);
  }
}
