import { Controller, Get, Post, Body, Patch, Param, Delete, HttpException, HttpStatus } from '@nestjs/common';

import { EvenementService } from './evenements.service'
import { Prisma } from '@prisma/client'
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger'
import { CreateEvenementDto } from './dto/create-evenements.dto';
import { UpdateEvenementDto } from './dto/update-evenements.dto';

@ApiTags('evenements')
@Controller('evenements')
export class EvenementController {
  constructor(private readonly evenementsService: EvenementService) { }

  @Post()
  @ApiOperation({ summary: "Create a event" })
  @ApiBody({ type: CreateEvenementDto })
  async create(@Body() createEvenementsDto: CreateEvenementDto) {
    const { titre, image, date, type, localisation, description, lien } = createEvenementsDto;
    if (!titre) {
      throw new HttpException("Missing 'titre' property for evenement creation", HttpStatus.BAD_REQUEST);
    }
    if (!image) {
      throw new HttpException("Missing 'image' property for evenement creation", HttpStatus.BAD_REQUEST);
    }
    if (!type) {
      throw new HttpException("Missing 'type' property for evenement creation", HttpStatus.BAD_REQUEST);
    }
    if (!description) {
      throw new HttpException("Missing 'description' property for evenement creation", HttpStatus.BAD_REQUEST);
    }
    const payload: Prisma.EvenementCreateInput = { titre, image, date, type, localisation, description, lien }

    const result = await this.evenementsService.create(payload)
    return result

  }

  @Get()
  @ApiOperation({ summary: "Get all events" })
  findAll() {
    return this.evenementsService.findAll()
  }

  @Get(':id')
  @ApiOperation({ summary: "Get a events by id" })
  findOne(@Param('id') id: string) {
    return this.evenementsService.findOne(+id)
  }

  @Patch(':id')
  @ApiOperation({ summary: "Update a event" })
  @ApiBody({ type: UpdateEvenementDto })
  update(@Param('id') id: string, @Body() updateEvenementsDto: UpdateEvenementDto) {

    const payload: Prisma.EvenementUpdateInput = { ...updateEvenementsDto }
    return this.evenementsService.update(+id, payload)
  }

  @Delete(':id')
  @ApiOperation({ summary: "Delete a event by id" })
  remove(@Param('id') id: string) {
    return this.evenementsService.remove(+id);
  }
}