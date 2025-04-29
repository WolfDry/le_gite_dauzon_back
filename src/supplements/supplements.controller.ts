import { Controller, Get, Post, Body, Patch, Param, Delete, HttpException, HttpStatus } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { Prisma } from '@prisma/client';
import { CreateSupplementDto } from './dto/create-supplements.dto';
import { UpdateSupplementDto } from './dto/update-supplements.dto';
import { SupplementsService } from './supplements.service';

@Controller('supplements')
export class SupplementsController {
  constructor(private readonly supplementsService: SupplementsService) {}

  @Post()
  async create(@Body() createSupplementsDto: CreateSupplementDto) {
    const { tarif, label, type } = createSupplementsDto;
    if (!tarif) {
      throw new HttpException("Missing 'tarif' property for reservation creation", HttpStatus.BAD_REQUEST);
    }
    if (!label) {
      throw new HttpException("Missing 'label' property for reservation creation", HttpStatus.BAD_REQUEST);
    }
    if (!type) {
      throw new HttpException("Missing 'type' property for reservation creation", HttpStatus.BAD_REQUEST);
    }
    const payload: Prisma.SupplementCreateInput = {
      tarif,
      label,
      type
    }
    
    const result = await this.supplementsService.create(payload);
    return result;

  }

  @Get()
  findAll() {
    return this.supplementsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.supplementsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSupplementDto: UpdateSupplementDto) {

    const payload: Prisma.ReservationUpdateInput = {...updateSupplementDto}
    return this.supplementsService.update(+id, payload);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.supplementsService.remove(+id);
  }
}