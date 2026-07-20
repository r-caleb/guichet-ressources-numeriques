import { Injectable } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  record(input: {
    action: AuditAction;
    message: string;
    requestId?: string;
    actorId?: string;
    metadata?: Prisma.InputJsonValue;
    ipAddress?: string;
  }) {
    return this.prisma.auditEvent.create({ data: input });
  }
}
