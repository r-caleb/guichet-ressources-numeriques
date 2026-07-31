import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuditAction } from '@prisma/client';
import * as argon2 from 'argon2';
import { AuditService } from '../audit/audit.service';
import { UsersService } from '../users/users.service';
import { AuthUser } from './auth.types';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly audit: AuditService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.users.findByEmail(dto.email);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Identifiants invalides.');
    }

    const passwordMatches = await argon2.verify(user.password, dto.password);
    if (!passwordMatches) {
      throw new UnauthorizedException('Identifiants invalides.');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      roles: user.roles,
    };

    return {
      accessToken: await this.jwt.signAsync(payload),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles,
      },
    };
  }

  async me(user: AuthUser) {
    const existing = await this.users.findPublicProfile(user.userId);
    if (!existing || !existing.isActive) {
      throw new UnauthorizedException('Compte introuvable ou désactivé.');
    }

    return existing;
  }

  async changePassword(user: AuthUser, dto: ChangePasswordDto) {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('La confirmation du nouveau mot de passe ne correspond pas.');
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('Le nouveau mot de passe doit être différent de l’ancien.');
    }

    const existing = await this.users.findById(user.userId);
    if (!existing || !existing.isActive) {
      throw new UnauthorizedException('Compte introuvable ou désactivé.');
    }

    const passwordMatches = await argon2.verify(existing.password, dto.currentPassword);
    if (!passwordMatches) {
      throw new UnauthorizedException('Mot de passe actuel incorrect.');
    }

    await this.users.updateOwnPassword(user.userId, dto.newPassword);
    await this.audit.record({
      action: AuditAction.PASSWORD_CHANGED,
      actorId: user.userId,
      message: 'Mot de passe du compte modifié par l’utilisateur connecté.',
      metadata: { email: user.email, roles: user.roles },
    });

    return { message: 'Mot de passe modifié avec succès.' };
  }
}
