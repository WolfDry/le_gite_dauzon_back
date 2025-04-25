import { Controller, Get, Post, Body, Patch, Param, Delete, HttpException, HttpStatus } from '@nestjs/common';

import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { Prisma } from '@prisma/client';

@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  async create(@Body() createClientDto: CreateClientDto) {
    const { email, nom, prenom, telephone } = createClientDto;
    if (!email) {
      throw new HttpException("Missing 'email' property for client creation", HttpStatus.BAD_REQUEST);
    }
    if (!nom) {
      throw new HttpException("Missing 'nom' property for client creation", HttpStatus.BAD_REQUEST);
    }
    if (!prenom) {
      throw new HttpException("Missing 'prenom' property for client creation", HttpStatus.BAD_REQUEST);
    }
    if (!telephone) {
      throw new HttpException("Missing 'telephone' property for client creation", HttpStatus.BAD_REQUEST);
    }
    const payload: Prisma.ClientCreateInput = {email, nom, prenom, telephone}
    
    const result = await this.clientsService.create(payload);
    return result;

  }

  @Get()
  findAll() {
    return this.clientsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clientsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateClientDto: UpdateClientDto) {

    const payload: Prisma.ClientUpdateInput = {...updateClientDto}
    return this.clientsService.update(+id, payload);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.clientsService.remove(+id);
  }
}