import { Controller, Get, Post, Body, Patch, Param, Delete, HttpException, HttpStatus } from '@nestjs/common';

import { CommentairesService } from './commentaires.service';
import { CreateCommentaireDto } from './dto/create-commentaires.dto';
import { UpdateCommentaireDto } from './dto/update-commentaires.dto';
import { Prisma } from '@prisma/client';
import { MailGunsService } from 'src/MailGun/mailGun.service';

@Controller('commentaires')
export class CommentairesController {
  constructor(private readonly commentairesService: CommentairesService, private readonly  mailGunService: MailGunsService) {}

  @Post()
  async create(@Body() createCommentaireDto: CreateCommentaireDto) {
    const { commentaire, nom, prenom, note } = createCommentaireDto;
    if (!commentaire) {
      throw new HttpException("Missing 'commentaire' property for commentaire creation", HttpStatus.BAD_REQUEST);
    }
    if (!nom) {
      throw new HttpException("Missing 'nom' property for commentaire creation", HttpStatus.BAD_REQUEST);
    }
    if (!prenom) {
      throw new HttpException("Missing 'prenom' property for commentaire creation", HttpStatus.BAD_REQUEST);
    }
    if (!note) {
      throw new HttpException("Missing 'note' property for commentaire creation", HttpStatus.BAD_REQUEST);
    }
    const payload: Prisma.CommentaireCreateInput = {commentaire, nom, prenom, note}
    
    const result = await this.commentairesService.create(payload)
    this.mailGunService.sendMail('commentaire')
    return result;

  }

  @Get()
  findAll() {
    return this.commentairesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.commentairesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCommentaireDto: UpdateCommentaireDto) {

    const payload: Prisma.CommentaireUpdateInput = {...updateCommentaireDto}
    return this.commentairesService.update(+id, payload);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.commentairesService.remove(+id);
  }
}