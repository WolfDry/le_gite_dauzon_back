import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { Prisma } from '@prisma/client';

/** Le hash du mot de passe ne sort jamais de l'API. */
const WITHOUT_PASSWORD = { password: true } as const;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) { }

  create(data: Prisma.UserCreateInput) {
    return this.prisma.user.create({ data, omit: WITHOUT_PASSWORD });
  }

  count() {
    return this.prisma.user.count();
  }

  findAll() {
    return this.prisma.user.findMany({ omit: WITHOUT_PASSWORD });
  }

  findOne(id: number) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id },
      omit: WITHOUT_PASSWORD,
    });
  }

  findByEmailWithPassword(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  update(id: number, data: Prisma.UserUpdateInput) {
    return this.prisma.user.update({
      where: { id },
      data,
      omit: WITHOUT_PASSWORD,
    });
  }

  remove(id: number) {
    return this.prisma.user.delete({ where: { id }, omit: WITHOUT_PASSWORD });
  }
}
