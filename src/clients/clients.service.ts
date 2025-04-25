import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ClientsService {
  constructor (private prisma: PrismaService) { }

  async create(data: Prisma.ClientCreateInput) {
    try {
      return await this.prisma.client.create({ data });
    } catch (error) {
      throw error;
    }
  }

  findAll() {
    return this.prisma.client.findMany();
  }

  findOne(id: number) {
    return this.prisma.client.findUnique({
      where: { id },
    });
  }

  update(id: number, data: Prisma.ClientUpdateInput) {
    return this.prisma.client.update({
      where: {id},
      data,
    });
  }

  remove(id: number) {
    return this.prisma.client.delete({ where: { id } });
  }
}