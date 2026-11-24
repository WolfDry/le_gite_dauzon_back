import { Module } from '@nestjs/common';
import { BlocagesController } from './blocages.controller';
import { BlocagesService } from './blocages.service';

@Module({
  controllers: [BlocagesController],
  providers: [BlocagesService],
  exports: [BlocagesService],
})
export class BlocagesModule {}
