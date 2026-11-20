import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class CommentairesService {
  constructor(private prisma: PrismaService) { }

  create(data: Prisma.CommentaireCreateInput) {
    return this.prisma.commentaire.create({ data });
  }

  findAll({ onlyVerified }: { onlyVerified: boolean }) {
    return this.prisma.commentaire.findMany({
      where: onlyVerified ? { verif: true } : undefined,
      // `created` est une date sans heure : l'id départage les commentaires du même jour.
      orderBy: [{ created: 'desc' }, { id: 'desc' }],
    });
  }

  findOne(id: number) {
    return this.prisma.commentaire.findUniqueOrThrow({
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