import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { SupplementsService } from './supplements.service';
import { SupplementsController } from './supplements.controller';

@Module({
  controllers: [SupplementsController],
  providers: [SupplementsService, PrismaService],
})
export class SupplementsModule {}