import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { Prisma } from '@prisma/client';
import { UploadService } from 'src/Upload/Upload.service';

@Injectable()
export class EvenementService {
  constructor(
    private prisma: PrismaService,
    private upload: UploadService,
  ) { }

  create(data: Prisma.EvenementCreateInput) {
    return this.prisma.evenement.create({ data });
  }

  findAll() {
    return this.prisma.evenement.findMany();
  }

  findOne(id: number) {
    return this.prisma.evenement.findUnique({
      where: { id },
    });
  }

  async update(id: number, data: Prisma.EvenementUpdateInput) {
    const before = await this.prisma.evenement.findUnique({ where: { id }, select: { image: true } });
    const updated = await this.prisma.evenement.update({
      where: { id },
      data,
    });
    if (before && updated.image !== before.image) {
      await this.upload.deleteImage(before.image);
    }
    return updated;
  }

  async remove(id: number) {
    const deleted = await this.prisma.evenement.delete({ where: { id } });
    await this.upload.deleteImage(deleted.image);
    return deleted;
  }
}
