import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ReservationsService {
  constructor (private prisma: PrismaService) { }

  async create(data: Prisma.ReservationCreateInput) {
    try {
      return await this.prisma.reservation.create({ data });
    } catch (error) {
      throw error;
    }
  }

  findAll() {
    return this.prisma.reservation.findMany({
      include: {
        client: true,
        supplements: {
          include: {
            supplement: true
          }
        }
      }
    });
  }

  
  findOne(id: number) {
    return this.prisma.reservation.findUnique({
      where: { id },
    });
  }

  update(id: number, data: Prisma.ReservationUpdateInput) {
    return this.prisma.reservation.update({
      where: {id},
      data,
    });
  }

  remove(id: number) {
    return this.prisma.reservation.delete({ where: { id } });
  }
}