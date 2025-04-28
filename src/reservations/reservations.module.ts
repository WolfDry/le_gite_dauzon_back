import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';
import { ClientsService } from 'src/clients/clients.service';

@Module({
  controllers: [ReservationsController],
  providers: [ReservationsService, ClientsService, PrismaService],
})
export class ReservationsModule {}