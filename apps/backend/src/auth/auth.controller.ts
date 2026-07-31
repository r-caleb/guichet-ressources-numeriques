import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthUser } from './auth.types';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

type AuthedRequest = Request & { user: AuthUser };

@ApiTags('Authentification')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @ApiOperation({
    summary: 'Connecter un utilisateur',
    description: "Vérifie les identifiants et retourne un jeton JWT pour accéder à l'espace connecté.",
  })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Get('me')
  @ApiOperation({
    summary: 'Lire le profil connecté',
    description: "Retourne l'identité et les rôles de l'utilisateur authentifié à partir du jeton JWT.",
  })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  me(@Req() request: AuthedRequest) {
    return this.auth.me(request.user);
  }

  @Post('change-password')
  @ApiOperation({
    summary: 'Changer son propre mot de passe',
    description:
      'Permet à l’utilisateur connecté de remplacer le mot de passe temporaire ou actuel par un nouveau mot de passe.',
  })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  changePassword(@Req() request: AuthedRequest, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(request.user, dto);
  }
}
