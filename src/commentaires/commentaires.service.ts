import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class CommentairesService {
  constructor(private prisma: PrismaService) { }

  async create(data: Prisma.CommentaireCreateInput) {
    try {
      return await this.prisma.commentaire.create({ data });
    } catch (error) {
      throw error;
    }
  }

  findAll() {
    return this.prisma.commentaire.findMany({
      orderBy: {
        created: 'desc',
      }
    });
  }

  findOne(id: number) {
    return this.prisma.commentaire.findUnique({
      where: { id },
    });
  }

  update(id: number, data: Prisma.CommentaireUpdateInput) {
    return this.prisma.commentaire.update({
      where: { id },
      data,
    });
  }

  remove(id: number) {
    return this.prisma.commentaire.delete({ where: { id } });
  }
}