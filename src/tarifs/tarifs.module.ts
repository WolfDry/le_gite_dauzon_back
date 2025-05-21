import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { TarifsController } from './tarifs.controller';
import { TarifsService } from './tarifs.service';

@Module({
  controllers: [TarifsController],
  providers: [TarifsService, PrismaService],
})
export class TarifsModule {}