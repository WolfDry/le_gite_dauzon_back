import { Module } from '@nestjs/common';
import { CommentairesController } from './commentaires.controller';
import { CommentairesService } from './commentaires.service';
import { MailGunModule } from 'src/MailGun/mailGun.module';

@Module({
  imports: [MailGunModule],
  controllers: [CommentairesController],
  providers: [CommentairesService],
})
export class CommentairesModule {}
