import { Controller, Get, Post, Body, Patch, Param, Delete, HttpException, HttpStatus } from '@nestjs/common';

import { Prisma } from '@prisma/client';
import { CreateSupplementDto } from './dto/create-supplements.dto';
import { UpdateSupplementDto } from './dto/update-supplements.dto';
import { SupplementsService } from './supplements.service';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
@ApiTags('supplements')
@Controller('supplements')
export class SupplementsController {
  constructor(private readonly supplementsService: SupplementsService) { }

  @Post()
  @ApiOperation({ summary: "Create a supplement" })
  @ApiBody({ type: CreateSupplementDto })
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
  @ApiOperation({ summary: "Get al supplements" })
  findAll() {
    return this.supplementsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: "Get a supplement by id" })
  findOne(@Param('id') id: string) {
    return this.supplementsService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: "Update a supplement" })
  @ApiBody({ type: UpdateSupplementDto })
  update(@Param('id') id: string, @Body() updateSupplementDto: UpdateSupplementDto) {

    const payload: Prisma.SupplementUpdateInput = { ...updateSupplementDto }
    return this.supplementsService.update(+id, payload);
  }

  @Delete(':id')
  @ApiOperation({ summary: "Delete a supplement by id" })
  remove(@Param('id') id: string) {
    return this.supplementsService.remove(+id);
  }
}