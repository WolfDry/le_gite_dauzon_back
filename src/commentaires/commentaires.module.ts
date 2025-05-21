import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CommentairesController } from './commentaires.controller';
import { CommentairesService } from './commentaires.service';
import { MailGunsService } from 'src/MailGun/mailGun.service';

@Module({
  controllers: [CommentairesController],
  providers: [CommentairesService, PrismaService, MailGunsService],
})
export class CommentairesModule {}