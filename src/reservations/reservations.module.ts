import { Module } from '@nestjs/common';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';
import { ClientsService } from 'src/clients/clients.service';
import { MailGunsService } from 'src/MailGun/mailGun.service';

@Module({
  controllers: [ReservationsController],
  providers: [ReservationsService, ClientsService, MailGunsService],
})
export class ReservationsModule {}