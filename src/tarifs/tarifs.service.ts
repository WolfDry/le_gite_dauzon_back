import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class TarifsService {
  constructor (private prisma: PrismaService) { }

  create(data: Prisma.TarifCreateInput) {
    return this.prisma.tarif.create({ data });
  }

  findAll() {
    return this.prisma.tarif.findMany();
  }

  findOne(id: number) {
    return this.prisma.tarif.findUniqueOrThrow({
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