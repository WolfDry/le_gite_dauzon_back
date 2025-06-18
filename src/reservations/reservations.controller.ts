import { Controller, Get, Post, Body, Patch, Param, Delete, HttpException, HttpStatus } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { CreateReservationDto } from './dto/create-reservation.dto'
import { ReservationsService } from './reservations.service'
import { UpdateReservationDto } from './dto/update-reservation.dto'
import { MailGunsService } from 'src/MailGun/mailGun.service'
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger'

@ApiTags('reservations')
@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService, private readonly mailGunService: MailGunsService) { }

  @Post()
  @ApiOperation({ summary: "Create a reservation" })
  @ApiBody({ type: CreateReservationDto })
  async create(@Body() createReservationDto: CreateReservationDto) {
    const { tarif, debut, fin, nbPersonne, clientId, email, nom, prenom, telephone, verif } = createReservationDto
    if (!tarif) {
      throw new HttpException("Missing 'tarif' property for reservation creation", HttpStatus.BAD_REQUEST)
    }
    if (!debut) {
      throw new HttpException("Missing 'debut' property for reservation creation", HttpStatus.BAD_REQUEST)
    }
    if (!fin) {
      throw new HttpException("Missing 'fin' property for reservation creation", HttpStatus.BAD_REQUEST)
    }
    if (!nbPersonne) {
      throw new HttpException("Missing 'nbPersonne' property for reservation creation", HttpStatus.BAD_REQUEST)
    }
    if (!clientId) {
      if (!email) {
        throw new HttpException("Missing 'email' property for client creation", HttpStatus.BAD_REQUEST)
      }
      if (!nom) {
        throw new HttpException("Missing 'nom' property for client creation", HttpStatus.BAD_REQUEST)
      }
      if (!prenom) {
        throw new HttpException("Missing 'prenom' property for client creation", HttpStatus.BAD_REQUEST)
      }
      if (!telephone) {
        throw new HttpException("Missing 'telephone' property for client creation", HttpStatus.BAD_REQUEST)
      }
    }
    const validatedClient = {
      nom: nom as string,
      prenom: prenom as string,
      email: email as string,
      telephone: telephone as string,
    }
    const payload: Prisma.ReservationCreateInput = {
      tarif,
      debut,
      fin,
      nbPersonne,
      verif,
      client: {
        connectOrCreate: {
          where: {
            id: clientId ?? ''
          },
          create: validatedClient
        }
      }
    }

    const result = await this.reservationsService.create(payload)
    this.mailGunService.sendMail('reservation')
    return result

  }

  @Get()
  @ApiOperation({ summary: "Get all reservations" })
  findAll() {
    return this.reservationsService.findAll()
  }

  @Get(':id')
  @ApiOperation({ summary: "Get a reservation by id" })
  findOne(@Param('id') id: string) {
    return this.reservationsService.findOne(+id)
  }

  @Patch(':id')
  @ApiOperation({ summary: "Update a reservation" })
  @ApiBody({ type: UpdateReservationDto })
  update(@Param('id') id: string, @Body() updateReservationDto: UpdateReservationDto) {

    const payload: Prisma.ReservationUpdateInput = { ...updateReservationDto }
    return this.reservationsService.update(+id, payload)
  }

  @Delete(':id')
  @ApiOperation({ summary: "Delete a reservation by id" })
  remove(@Param('id') id: string) {
    return this.reservationsService.remove(+id)
  }
}