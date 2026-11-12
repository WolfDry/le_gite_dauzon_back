import { Global, Module } from '@nestjs/common'
import { PrismaService } from '../prisma.service'

/**
 * Une seule instance de PrismaClient pour toute l'application
 * (une par module ouvrait autant de pools de connexions à la base).
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule { }
