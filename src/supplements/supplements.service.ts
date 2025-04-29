import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

@Injectable()
export class SupplementsService {
  constructor (private prisma: PrismaService) { }

  async create(data: Prisma.SupplementCreateInput) {
    try {
      return await this.prisma.supplement.create({ data });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Label already taken');
        }
      }
      throw error;
    }
  }

  findAll() {
    return this.prisma.supplement.findMany();
  }

  findOne(id: number) {
    return this.prisma.supplement.findUnique({
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