import { Controller, Get, Post, Body, Patch, Param, Delete, HttpException, HttpStatus } from '@nestjs/common';

import { TarifsService } from './tarifs.service';
import { CreateTarifsDto } from './dto/create-tarifs.dto';
import { UpdateTarifsDto } from './dto/update-tarifs.dto';
import { Prisma } from '@prisma/client';

@Controller('tarifs')
export class TarifsController {
  constructor(private readonly tarifsService: TarifsService) {}

  @Post()
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
    const payload: Prisma.TarifCreateInput = {desc, label, start_date, end_date, vacance, prix, frequence}
    
    const result = await this.tarifsService.create(payload)
    return result;

  }

  @Get()
  findAll() {
    return this.tarifsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tarifsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTarifsDto: UpdateTarifsDto) {

    const payload: Prisma.TarifUpdateInput = {...updateTarifsDto}
    return this.tarifsService.update(+id, payload);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tarifsService.remove(+id);
  }
}