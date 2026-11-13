import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class SupplementsService {
  constructor (private prisma: PrismaService) { }

  create(data: Prisma.SupplementCreateInput) {
    return this.prisma.supplement.create({ data });
  }

  findAll() {
    return this.prisma.supplement.findMany();
  }

  findOne(id: number) {
    return this.prisma.supplement.findUniqueOrThrow({
      where: { id },
    });
  }

  update(id: number, data: Prisma.SupplementUpdateInput) {
    return this.prisma.supplement.update({
      where: {id},
      data,
    });
  }

  remove(id: number) {
    return this.prisma.supplement.delete({ where: { id } });
  }
}