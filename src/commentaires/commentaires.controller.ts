import { Controller, Get, Post, Body, Patch, Param, Delete, HttpException, HttpStatus } from '@nestjs/common';

import { CommentairesService } from './commentaires.service';
import { CreateCommentaireDto } from './dto/create-commentaires.dto';
import { UpdateCommentaireDto } from './dto/update-commentaires.dto';
import { Prisma } from '@prisma/client';
import { MailGunsService } from 'src/MailGun/mailGun.service';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('commentaires')
@Controller('commentaires')
export class CommentairesController {
  constructor(private readonly commentairesService: CommentairesService, private readonly mailGunService: MailGunsService) { }

  @Post()
  @ApiOperation({ summary: "Create a comment" })
  @ApiBody({ type: CreateCommentaireDto })
  async create(@Body() createCommentaireDto: CreateCommentaireDto) {
    const { commentaire, name, note } = createCommentaireDto;
    if (!commentaire) {
      throw new HttpException("Missing 'commentaire' property for commentaire creation", HttpStatus.BAD_REQUEST);
    }
    if (!name) {
      throw new HttpException("Missing 'name' property for commentaire creation", HttpStatus.BAD_REQUEST);
    }
    if (!note) {
      throw new HttpException("Missing 'note' property for commentaire creation", HttpStatus.BAD_REQUEST);
    }
    const payload: Prisma.CommentaireCreateInput = { commentaire, name, note }

    const result = await this.commentairesService.create(payload)
    this.mailGunService.sendMail('commentaire')
    return result;

  }

  @Get()
  @ApiOperation({ summary: "Get all comments" })
  findAll() {
    return this.commentairesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: "Get a comment by id" })
  findOne(@Param('id') id: string) {
    return this.commentairesService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: "Update a comment" })
  update(@Param('id') id: string, @Body() updateCommentaireDto: UpdateCommentaireDto) {

    const payload: Prisma.CommentaireUpdateInput = { ...updateCommentaireDto }
    return this.commentairesService.update(+id, payload);
  }

  @Delete(':id')
  @ApiOperation({ summary: "Delete a comment by id" })
  remove(@Param('id') id: string) {
    return this.commentairesService.remove(+id);
  }
}