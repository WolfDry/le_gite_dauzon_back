import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class SupplementsService {
  constructor (private prisma: PrismaService) { }

  /**
   * Un seul supplément est facturé par animal : en marquer un retire la marque des autres,
   * dans la même transaction que l'enregistrement.
   */
  create(data: Prisma.SupplementCreateInput) {
    if (data.parAnimal !== true) {
      return this.prisma.supplement.create({ data });
    }
    return this.prisma
      .$transaction([this.unmarkParAnimal(), this.prisma.supplement.create({ data })])
      .then(([, created]) => created);
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
    if (data.parAnimal !== true) {
      return this.prisma.supplement.update({ where: { id }, data });
    }
    return this.prisma
      .$transaction([this.unmarkParAnimal(id), this.prisma.supplement.update({ where: { id }, data })])
      .then(([, updated]) => updated);
  }

  remove(id: number) {
    return this.prisma.supplement.delete({ where: { id } });
  }

  private unmarkParAnimal(exceptId?: number) {
    return this.prisma.supplement.updateMany({
      where: { parAnimal: true, ...(exceptId !== undefined && { id: { not: exceptId } }) },
      data: { parAnimal: false },
    });
  }
}
