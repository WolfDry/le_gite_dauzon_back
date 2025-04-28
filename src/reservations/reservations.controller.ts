import { Controller, Get, Post, Body, Patch, Param, Delete, HttpException, HttpStatus } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { Prisma } from '@prisma/client';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { ReservationsService } from './reservations.service';
import { UpdateReservationDto } from './dto/udpate-reservation.dto';
import { ClientsService } from 'src/clients/clients.service';

@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService, private readonly  clientsService: ClientsService) {}

  @Post()
  async create(@Body() createReservationDto: CreateReservationDto) {
    const { tarif, debut, fin, nbPersonne, clientId, email, nom, prenom, telephone } = createReservationDto;
    if (!tarif) {
      throw new HttpException("Missing 'tarif' property for reservation creation", HttpStatus.BAD_REQUEST);
    }
    if (!debut) {
      throw new HttpException("Missing 'debut' property for reservation creation", HttpStatus.BAD_REQUEST);
    }
    if (!fin) {
      throw new HttpException("Missing 'fin' property for reservation creation", HttpStatus.BAD_REQUEST);
    }
    if (!nbPersonne) {
      throw new HttpException("Missing 'nbPersonne' property for reservation creation", HttpStatus.BAD_REQUEST);
    }
    if (!clientId) {
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
    }
    const validatedClient = {
      nom: nom as string,
      prenom: prenom as string,
      email: email as string,
      telephone: telephone as string,
    };    
    const payload: Prisma.ReservationCreateInput = {
      tarif,
      debut,
      fin,
      nbPersonne,
      client: {
        connectOrCreate: {
          where: {
            id: clientId ?? ''
          },
          create: validatedClient
        }
      }
    }
    
    const result = await this.reservationsService.create(payload);
    return result;

  }

  @Get()
  findAll() {
    return this.reservationsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.reservationsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateReservationDto: UpdateReservationDto) {

    const payload: Prisma.ReservationUpdateInput = {...updateReservationDto}
    return this.reservationsService.update(+id, payload);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.reservationsService.remove(+id);
  }
}