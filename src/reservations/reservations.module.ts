import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';
import { ClientsService } from 'src/clients/clients.service';
import { MailGunsService } from 'src/MailGun/mailGun.service';

@Module({
  controllers: [ReservationsController],
  providers: [ReservationsService, ClientsService, PrismaService, MailGunsService],
})
export class ReservationsModule {}