import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class EvenementService {
  constructor(private prisma: PrismaService) { }

  async create(data: Prisma.EvenementCreateInput) {
    try {
      return await this.prisma.evenement.create({ data });
    } catch (error) {
      throw error;
    }
  }

  findAll() {
    return this.prisma.evenement.findMany();
  }

  findOne(id: number) {
    return this.prisma.evenement.findUnique({
      where: { id },
    });
  }

  update(id: number, data: Prisma.EvenementUpdateInput) {
    return this.prisma.evenement.update({
      where: { id },
      data,
    });
  }

  remove(id: number) {
    return this.prisma.evenement.delete({ where: { id } });
  }
}