import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { UserRole } from '@prisma/client';
import { AuthUser } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { ResetUserPasswordDto } from './dto/reset-user-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UsersService } from './users.service';

type AuthedRequest = Request & { user: AuthUser };

@ApiTags('Administration - Utilisateurs')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @ApiOperation({
    summary: 'Lister les utilisateurs',
    description: 'Retourne les agents et administrateurs du back-office sans exposer les mots de passe.',
  })
  list() {
    return this.users.list();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Consulter un utilisateur',
    description: "Retourne le détail d'un compte agent ou administrateur.",
  })
  findOne(@Param('id') id: string) {
    return this.users.findAdminDetail(id);
  }

  @Post()
  @ApiOperation({
    summary: 'Créer un utilisateur',
    description:
      'Crée un compte agent ou administrateur. Seul un Super Administrateur peut créer un compte administrateur.',
  })
  create(@Req() request: AuthedRequest, @Body() dto: CreateUserDto) {
    return this.users.createAdminUser(dto, request.user);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Modifier un utilisateur',
    description:
      "Met à jour les informations et rôles d'un compte. Les comptes administrateurs sont réservés au Super Administrateur.",
  })
  update(@Req() request: AuthedRequest, @Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.users.updateAdminUser(id, dto, request.user);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Activer ou désactiver un utilisateur',
    description: "Active ou désactive l'accès d'un utilisateur au back-office sans supprimer son historique.",
  })
  updateStatus(@Req() request: AuthedRequest, @Param('id') id: string, @Body() dto: UpdateUserStatusDto) {
    return this.users.updateStatus(id, dto.isActive, request.user);
  }

  @Patch(':id/password')
  @ApiOperation({
    summary: 'Réinitialiser le mot de passe',
    description: "Remplace le mot de passe d'un utilisateur par un nouveau mot de passe hashé.",
  })
  resetPassword(@Req() request: AuthedRequest, @Param('id') id: string, @Body() dto: ResetUserPasswordDto) {
    return this.users.resetPassword(id, dto.password, request.user);
  }
}
