import { Module } from '@nestjs/common'
import { PrismaService } from 'src/prisma.service'
import { EvenementController } from './evenements.controller'
import { EvenementService } from './evenements.service'

@Module({
  controllers: [EvenementController],
  providers: [EvenementService, PrismaService],
})
export class EvenementsModule { }