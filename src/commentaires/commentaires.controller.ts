import { Controller, Get, Post, Body, Patch, Param, Delete, BadRequestException, ParseIntPipe, Logger } from '@nestjs/common';

import { CommentairesService } from './commentaires.service';
import { CreateCommentaireDto } from './dto/create-commentaires.dto';
import { UpdateCommentaireDto } from './dto/update-commentaires.dto';
import { Prisma } from '@prisma/client';
import { MailGunsService } from 'src/MailGun/mailGun.service';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser, Public } from 'src/auth/public.decorator';
import { ThrottlePublicWrite } from 'src/common/throttle';
import { ProtectFromBots } from 'src/common/anti-bot';
import { fieldMessage } from 'src/common/validation-messages';

@ApiTags('commentaires')
@ApiBearerAuth()
@Controller('commentaires')
export class CommentairesController {
  private readonly logger = new Logger(CommentairesController.name);

  constructor(private readonly commentairesService: CommentairesService, private readonly mailGunService: MailGunsService) { }

  @Public()
  @ThrottlePublicWrite()
  @ProtectFromBots()
  @Post()
  @ApiOperation({ summary: "Create a comment" })
  @ApiBody({ type: CreateCommentaireDto })
  async create(@Body() createCommentaireDto: CreateCommentaireDto, @CurrentUser() currentUser: AuthUser | null) {
    const { commentaire, name, note, verif, created } = createCommentaireDto;

    if (!currentUser && note < 1) {
      throw new BadRequestException([fieldMessage('note', 'doit valoir au moins 1')]);
    }

    const payload: Prisma.CommentaireCreateInput = { commentaire, name, note }

    if (currentUser) {
      if (verif) {
        payload.verif = verif;
      }

      if (created) {
        payload.created = created;
      }
    }

    const result = await this.commentairesService.create(payload)
    try {
      await this.mailGunService.sendMail('commentaire', { name, note, message: commentaire })
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      this.logger.error(`Mail du commentaire ${result.id} non envoyé : ${reason}`)
    }
    return result;

  }

  @Public()
  @Get()
  @ApiOperation({ summary: "Get comments (validated only without a token, all with the admin token)" })
  findAll(@CurrentUser() currentUser: AuthUser | null) {
    return this.commentairesService.findAll({ onlyVerified: !currentUser });
  }

  @Get(':id')
  @ApiOperation({ summary: "Get a comment by id" })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.commentairesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: "Update a comment" })
  @ApiBody({ type: UpdateCommentaireDto })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateCommentaireDto: UpdateCommentaireDto) {

    const payload: Prisma.CommentaireUpdateInput = { ...updateCommentaireDto }
    return this.commentairesService.update(id, payload);
  }

  @Delete(':id')
  @ApiOperation({ summary: "Delete a comment by id" })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.commentairesService.remove(id);
  }
}
