import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe } from '@nestjs/common';

import { EvenementService } from './evenements.service'
import { Prisma } from '@prisma/client'
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger'
import { CreateEvenementDto } from './dto/create-evenements.dto';
import { UpdateEvenementDto } from './dto/update-evenements.dto';
import { Public } from 'src/auth/public.decorator';

@ApiTags('evenements')
@ApiBearerAuth()
@Controller('evenements')
export class EvenementController {
  constructor(private readonly evenementsService: EvenementService) { }

  @Post()
  @ApiOperation({ summary: "Create a event" })
  @ApiBody({ type: CreateEvenementDto })
  create(@Body() createEvenementsDto: CreateEvenementDto) {
    const { titre, image, date, type, localisation, description, lien } = createEvenementsDto;
    const payload: Prisma.EvenementCreateInput = { titre, image, date, type, localisation, description, lien }
    return this.evenementsService.create(payload)
  }

  @Public()
  @Get()
  @ApiOperation({ summary: "Get all events" })
  findAll() {
    return this.evenementsService.findAll()
  }

  @Get(':id')
  @ApiOperation({ summary: "Get a events by id" })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.evenementsService.findOne(id)
  }

  @Patch(':id')
  @ApiOperation({ summary: "Update a event" })
  @ApiBody({ type: UpdateEvenementDto })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateEvenementsDto: UpdateEvenementDto) {
    const payload: Prisma.EvenementUpdateInput = { ...updateEvenementsDto }
    return this.evenementsService.update(id, payload)
  }

  @Delete(':id')
  @ApiOperation({ summary: "Delete a event by id" })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.evenementsService.remove(id);
  }
}
