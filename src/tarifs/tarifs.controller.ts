import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe } from '@nestjs/common';

import { TarifsService } from './tarifs.service';
import { CreateTarifsDto } from './dto/create-tarifs.dto';
import { UpdateTarifsDto } from './dto/update-tarifs.dto';
import { Prisma } from '@prisma/client';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/auth/public.decorator';
@ApiTags('tarifs')
@ApiBearerAuth()
@Controller('tarifs')
export class TarifsController {
  constructor(private readonly tarifsService: TarifsService) { }

  @Post()
  @ApiOperation({ summary: "Create a tarif" })
  @ApiBody({ type: CreateTarifsDto })
  create(@Body() createTarifsDto: CreateTarifsDto) {
    const { desc, label, date, vacance, prix, frequence } = createTarifsDto;
    const payload: Prisma.TarifCreateInput = { desc, label, date, vacance, prix, frequence }
    return this.tarifsService.create(payload)
  }

  @Public()
  @Get()
  @ApiOperation({ summary: "Get all tarifs" })
  findAll() {
    return this.tarifsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: "Get a tarif by id" })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tarifsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: "Update a tarif" })
  @ApiBody({ type: UpdateTarifsDto })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateTarifsDto: UpdateTarifsDto) {

    const payload: Prisma.TarifUpdateInput = { ...updateTarifsDto }
    return this.tarifsService.update(id, payload);
  }

  @Delete(':id')
  @ApiOperation({ summary: "Delete a tarif by id" })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.tarifsService.remove(id);
  }
}
