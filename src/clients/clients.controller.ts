import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe } from '@nestjs/common';

import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { Prisma } from '@prisma/client';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';

@ApiTags('clients')
@ApiBearerAuth()
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) { }

  @Post()
  @ApiBody({ type: CreateClientDto })
  create(@Body() createClientDto: CreateClientDto) {
    const { email, nom, prenom, telephone } = createClientDto;
    const payload: Prisma.ClientCreateInput = { email, nom, prenom, telephone }
    return this.clientsService.create(payload);
  }

  @Get()
  findAll() {
    return this.clientsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.clientsService.findOne(id);
  }

  @Patch(':id')
  @ApiBody({ type: UpdateClientDto })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateClientDto: UpdateClientDto) {

    const payload: Prisma.ClientUpdateInput = { ...updateClientDto }
    return this.clientsService.update(id, payload);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.clientsService.remove(id);
  }
}
