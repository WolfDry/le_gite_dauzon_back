import { Module } from '@nestjs/common';
import { CronController } from './cron.controller';
import { ReservationsModule } from '../reservations/reservations.module';

@Module({
  imports: [ReservationsModule],
  controllers: [CronController],
})
export class CronModule { }
