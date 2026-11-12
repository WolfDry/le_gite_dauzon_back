import { Module } from '@nestjs/common';
import { CommentairesController } from './commentaires.controller';
import { CommentairesService } from './commentaires.service';
import { MailGunsService } from 'src/MailGun/mailGun.service';

@Module({
  controllers: [CommentairesController],
  providers: [CommentairesService, MailGunsService],
})
export class CommentairesModule {}