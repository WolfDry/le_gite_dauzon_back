import { Module } from '@nestjs/common';
import { UploadController } from './Upload.controller';
import { UploadService } from './Upload.service';

@Module({
  controllers: [UploadController],
  providers: [UploadService],
  exports: [UploadService],
})
export class UploadModule { }
