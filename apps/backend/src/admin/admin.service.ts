import { Injectable } from '@nestjs/common';
import { RequestStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardStats() {
    const [total, received, underReview, closed] = await Promise.all([
      this.prisma.resourceRequest.count(),
      this.prisma.resourceRequest.count({ where: { status: RequestStatus.RECEIVED } }),
      this.prisma.resourceRequest.count({ where: { status: RequestStatus.UNDER_REVIEW } }),
      this.prisma.resourceRequest.count({ where: { status: RequestStatus.CLOSED } }),
    ]);

    return { total, received, underReview, closed };
  }
}
