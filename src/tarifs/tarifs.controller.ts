import { Controller, Get, Post, Body, Patch, Param, Delete, HttpException, HttpStatus } from '@nestjs/common';

import { TarifsService } from './tarifs.service';
import { CreateTarifsDto } from './dto/create-tarifs.dto';
import { UpdateTarifsDto } from './dto/update-tarifs.dto';
import { Prisma } from '@prisma/client';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
@ApiTags('tarifs')
@Controller('tarifs')
export class TarifsController {
  constructor(private readonly tarifsService: TarifsService) { }

  @Post()
  @ApiOperation({ summary: "Create a tarif" })
  @ApiBody({ type: CreateTarifsDto })
  async create(@Body() createTarifsDto: CreateTarifsDto) {
    const { desc, label, start_date, end_date, vacance, prix, frequence } = createTarifsDto;
    if (!desc) {
      throw new HttpException("Missing 'desc' property for tarif creation", HttpStatus.BAD_REQUEST);
    }
    if (!label) {
      throw new HttpException("Missing 'label' property for tarif creation", HttpStatus.BAD_REQUEST);
    }
    if (!start_date) {
      throw new HttpException("Missing 'startDate' property for tarif creation", HttpStatus.BAD_REQUEST);
    }
    if (!end_date) {
      throw new HttpException("Missing 'endDate' property for tarif creation", HttpStatus.BAD_REQUEST);
    }
    if (!prix) {
      throw new HttpException("Missing 'prix' property for tarif creation", HttpStatus.BAD_REQUEST);
    }
    if (!frequence) {
      throw new HttpException("Missing 'frequence' property for tarif creation", HttpStatus.BAD_REQUEST);
    }
    const payload: Prisma.TarifCreateInput = { desc, label, start_date, end_date, vacance, prix, frequence }

    const result = await this.tarifsService.create(payload)
    return result;

  }

  @Get()
  @ApiOperation({ summary: "Get all tarifs" })
  findAll() {
    return this.tarifsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: "Get a tarif by id" })
  findOne(@Param('id') id: string) {
    return this.tarifsService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: "Update a tarif" })
  @ApiBody({ type: UpdateTarifsDto })
  update(@Param('id') id: string, @Body() updateTarifsDto: UpdateTarifsDto) {

    const payload: Prisma.TarifUpdateInput = { ...updateTarifsDto }
    return this.tarifsService.update(+id, payload);
  }

  @Delete(':id')
  @ApiOperation({ summary: "Delete a tarif by id" })
  remove(@Param('id') id: string) {
    return this.tarifsService.remove(+id);
  }
}