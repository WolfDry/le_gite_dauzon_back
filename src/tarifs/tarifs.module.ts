import { Module } from '@nestjs/common';
import { TarifsController } from './tarifs.controller';
import { TarifsService } from './tarifs.service';

@Module({
  controllers: [TarifsController],
  providers: [TarifsService],
})
export class TarifsModule {}