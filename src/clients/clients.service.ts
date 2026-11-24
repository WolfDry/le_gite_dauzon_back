import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) { }

  create(data: Prisma.ClientCreateInput) {
    return this.prisma.client.create({ data });
  }

  async findAll() {
    const clients = await this.prisma.client.findMany({
      include: { _count: { select: { reservations: true } } },
    });
    return clients.map(({ _count, ...client }) => ({ ...client, nbReservations: _count.reservations }));
  }

  findOne(id: number) {
    return this.prisma.client.findUniqueOrThrow({
      where: { id },
    });
  }

  update(id: number, data: Prisma.ClientUpdateInput) {
    return this.prisma.client.update({
      where: { id },
      data,
    });
  }

  remove(id: number) {
    return this.prisma.client.delete({ where: { id } });
  }
}