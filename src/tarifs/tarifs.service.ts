import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class TarifsService {
  constructor (private prisma: PrismaService) { }

  async create(data: Prisma.TarifCreateInput) {
    try {
      return await this.prisma.tarif.create({ data });
    } catch (error) {
      throw error;
    }
  }

  findAll() {
    return this.prisma.tarif.findMany();
  }

  findOne(id: number) {
    return this.prisma.tarif.findUnique({
      where: { id },
    });
  }

  update(id: number, data: Prisma.TarifUpdateInput) {
    return this.prisma.tarif.update({
      where: {id},
      data,
    });
  }

  remove(id: number) {
    return this.prisma.tarif.delete({ where: { id } });
  }
}