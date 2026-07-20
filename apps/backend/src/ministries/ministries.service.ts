import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMinistryDto } from './dto/create-ministry.dto';
import { UpdateMinistryDto } from './dto/update-ministry.dto';

@Injectable()
export class MinistriesService {
  constructor(private readonly prisma: PrismaService) {}

  listActive() {
    return this.prisma.ministry.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  listAll() {
    return this.prisma.ministry.findMany({
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string) {
    const ministry = await this.prisma.ministry.findUnique({ where: { id } });
    if (!ministry) throw new NotFoundException('Ministère introuvable.');
    return ministry;
  }

  create(dto: CreateMinistryDto) {
    return this.prisma.ministry.create({ data: dto });
  }

  async update(id: string, dto: UpdateMinistryDto) {
    await this.findOne(id);
    return this.prisma.ministry.update({
      where: { id },
      data: dto,
    });
  }

  async updateStatus(id: string, isActive: boolean) {
    await this.findOne(id);
    return this.prisma.ministry.update({
      where: { id },
      data: { isActive },
    });
  }
}
