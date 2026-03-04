import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { UploadController } from './Upload.controller';
import { UploadService } from './Upload.service';

@Module({
  controllers: [UploadController],
  providers: [UploadService, PrismaService],
})
export class UploadModule { }