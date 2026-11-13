import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe } from '@nestjs/common';

import { Prisma } from '@prisma/client';
import { CreateSupplementDto } from './dto/create-supplements.dto';
import { UpdateSupplementDto } from './dto/update-supplements.dto';
import { SupplementsService } from './supplements.service';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
@ApiTags('supplements')
@ApiBearerAuth()
@Controller('supplements')
export class SupplementsController {
  constructor(private readonly supplementsService: SupplementsService) { }

  @Post()
  @ApiOperation({ summary: "Create a supplement" })
  @ApiBody({ type: CreateSupplementDto })
  create(@Body() createSupplementsDto: CreateSupplementDto) {
    const { tarif, label, type } = createSupplementsDto;
    const payload: Prisma.SupplementCreateInput = {
      tarif,
      label,
      type
    }
    return this.supplementsService.create(payload);
  }

  @Get()
  @ApiOperation({ summary: "Get al supplements" })
  findAll() {
    return this.supplementsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: "Get a supplement by id" })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.supplementsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: "Update a supplement" })
  @ApiBody({ type: UpdateSupplementDto })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateSupplementDto: UpdateSupplementDto) {

    const payload: Prisma.SupplementUpdateInput = { ...updateSupplementDto }
    return this.supplementsService.update(id, payload);
  }

  @Delete(':id')
  @ApiOperation({ summary: "Delete a supplement by id" })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.supplementsService.remove(id);
  }
}
