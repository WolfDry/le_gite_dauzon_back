import { Module } from '@nestjs/common';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';
import { MailGunModule } from 'src/MailGun/mailGun.module';
import { TarificationModule } from 'src/tarification/tarification.module';

@Module({
  imports: [MailGunModule, TarificationModule],
  controllers: [ReservationsController],
  providers: [ReservationsService],
  exports: [ReservationsService],
})
export class ReservationsModule {}
