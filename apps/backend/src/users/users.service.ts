import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { AuditAction, Prisma, UserRole } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private readonly safeUserSelect = {
    id: true,
    email: true,
    firstName: true,
    lastName: true,
    middleName: true,
    phone: true,
    functionTitle: true,
    department: true,
    ministryId: true,
    ministry: true,
    otherInstitutionName: true,
    roles: true,
    isActive: true,
    createdAt: true,
    updatedAt: true,
  } satisfies Prisma.UserSelect;

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findPublicProfile(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: this.safeUserSelect,
    });
  }

  create(data: Prisma.UserCreateInput) {
    return this.prisma.user.create({ data });
  }

  list() {
    return this.prisma.user.findMany({
      select: this.safeUserSelect,
      orderBy: [{ isActive: 'desc' }, { lastName: 'asc' }, { firstName: 'asc' }],
    });
  }

  async findAdminDetail(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: this.safeUserSelect,
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable.');
    return user;
  }

  async createAdminUser(dto: CreateUserDto, actor: AuthUser) {
    const roles = dto.roles?.length ? dto.roles : [UserRole.AGENT];
    this.assertCanManageRoles(actor, roles);

    return this.handleUniqueEmail(async () =>
      this.prisma.user.create({
        select: this.safeUserSelect,
        data: {
          email: dto.email,
          password: await argon2.hash(dto.password),
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          roles,
          isActive: true,
        },
      }),
    );
  }

  async updateAdminUser(id: string, dto: UpdateUserDto, actor: AuthUser) {
    const existing = await this.findById(id);
    if (!existing) throw new NotFoundException('Utilisateur introuvable.');

    this.assertCanManageRoles(actor, existing.roles, dto.roles);

    return this.handleUniqueEmail(() =>
      this.prisma.user.update({
        where: { id },
        select: this.safeUserSelect,
        data: {
          email: dto.email,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          roles: dto.roles,
          isActive: dto.isActive,
        },
      }),
    );
  }

  async updateStatus(id: string, isActive: boolean, actor: AuthUser) {
    const existing = await this.findById(id);
    if (!existing) throw new NotFoundException('Utilisateur introuvable.');
    if (actor.userId === id && !isActive) {
      throw new BadRequestException('Vous ne pouvez pas désactiver votre propre compte.');
    }

    this.assertCanManageRoles(actor, existing.roles);

    return this.prisma.user.update({
      where: { id },
      select: this.safeUserSelect,
      data: { isActive },
    });
  }

  async resetPassword(id: string, password: string, actor: AuthUser) {
    const existing = await this.findById(id);
    if (!existing) throw new NotFoundException('Utilisateur introuvable.');

    this.assertCanManageRoles(actor, existing.roles);

    const updated = await this.prisma.user.update({
      where: { id },
      select: this.safeUserSelect,
      data: { password: await argon2.hash(password) },
    });

    await this.audit.record({
      action: AuditAction.PASSWORD_CHANGED,
      actorId: actor.userId,
      message: `Mot de passe réinitialisé pour ${existing.email}.`,
      metadata: { targetUserId: id, targetEmail: existing.email, targetRoles: existing.roles },
    });

    return updated;
  }

  async updateOwnPassword(id: string, password: string) {
    return this.prisma.user.update({
      where: { id },
      select: this.safeUserSelect,
      data: { password: await argon2.hash(password) },
    });
  }

  private assertCanManageRoles(actor: AuthUser, currentRoles: UserRole[], nextRoles?: UserRole[]) {
    if (actor.roles.includes(UserRole.SUPER_ADMIN)) return;

    const regularRoles: UserRole[] = [UserRole.AGENT, UserRole.POINT_FOCAL];
    const managesPrivilegedUser = currentRoles.some((role) => !regularRoles.includes(role));
    const grantsPrivilegedRole = nextRoles?.some((role) => !regularRoles.includes(role)) ?? false;

    if (managesPrivilegedUser || grantsPrivilegedRole) {
      throw new ForbiddenException('Seul un Super Administrateur peut gérer les comptes administrateurs.');
    }
  }

  private async handleUniqueEmail<T>(operation: () => Promise<T>) {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Cette adresse email est déjà utilisée.');
      }
      throw error;
    }
  }
}
