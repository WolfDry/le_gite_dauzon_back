import { Module } from '@nestjs/common';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';
import { MailGunModule } from 'src/MailGun/mailGun.module';
import { TarificationModule } from 'src/tarification/tarification.module';
import { BlocagesModule } from 'src/blocages/blocages.module';

@Module({
  imports: [MailGunModule, TarificationModule, BlocagesModule],
  controllers: [ReservationsController],
  providers: [ReservationsService],
  exports: [ReservationsService],
})
export class ReservationsModule {}
