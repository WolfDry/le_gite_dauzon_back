import { Module } from '@nestjs/common';
import { CronController } from './cron.controller';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [CronController],
  providers: [PrismaService],
})
export class CronModule { }
