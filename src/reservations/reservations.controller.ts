import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, Logger } from '@nestjs/common'
import { Prisma, ReservationSource, ReservationStatut } from '@prisma/client'
import { CreateReservationDto } from './dto/create-reservation.dto'
import { ReservationsService } from './reservations.service'
import { UpdateReservationDto } from './dto/update-reservation.dto'
import { MailGunsService } from 'src/MailGun/mailGun.service'
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger'
import { CreateRequestReservationDto } from './dto/create-request-reservation.dto'
import { Public } from 'src/auth/public.decorator'
import { ThrottlePublicWrite } from 'src/common/throttle'
import { toNbPersonneJson } from './dto/nb-personne.dto'

@ApiTags('reservations')
@ApiBearerAuth()
@Controller('reservations')
export class ReservationsController {
  private readonly logger = new Logger(ReservationsController.name)

  constructor(private readonly reservationsService: ReservationsService, private readonly mailGunService: MailGunsService) { }

  @Post()
  @ApiOperation({ summary: "Create a reservation" })
  @ApiBody({ type: CreateReservationDto })
  async create(@Body() createReservationDto: CreateReservationDto) {
    const { tarif, debut, fin, nbPersonne, clientId, email, nom, prenom, telephone, statut } = createReservationDto
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
      nbPersonne: toNbPersonneJson(nbPersonne),
      statut: statut ?? ReservationStatut.CONFIRMEE,
      source: ReservationSource.ADMIN,
      client: {
        connectOrCreate: {
          where: {
            id: clientId ?? -1
          },
          create: validatedClient
        }
      }
    }

    const supplements = await this.reservationsService.priceSupplements(createReservationDto.supplements ?? [])
    const result = await this.reservationsService.create(payload)

    if (supplements.length) {
      await Promise.all(
        supplements.map(supplement =>
          this.reservationsService.addSupplementToReservation(result.id, supplement)
        )
      )
    }

    return result
  }

  @Public()
  @ThrottlePublicWrite()
  @Post('/request')
  @ApiOperation({ summary: "Create a reservation request (public, always DEMANDE)" })
  @ApiBody({ type: CreateRequestReservationDto })
  async createRequest(@Body() dto: CreateRequestReservationDto) {
    const reservation = await this.reservationsService.createRequest(dto)

    try {
      await this.mailGunService.sendMail('reservation', {
        name: dto.nom,
        email: dto.email,
        phone: dto.phone,
        message: dto.message,
        debut: dto.debut,
        fin: dto.fin,
        nbPersonne: dto.nbPersonne,
      })
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      this.logger.error(`Mail de la demande de réservation ${reservation.id} non envoyé : ${reason}`)
    }

    return { id: reservation.id }
  }

  @Public()
  @Get('disponibilites')
  @ApiOperation({ summary: "Booked stays (OPTION or CONFIRMEE) from January 1st of the current year (dates only, public)" })
  findDisponibilites() {
    const startOfYear = new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1))
    return this.reservationsService.findDisponibilites(startOfYear)
  }

  @Get()
  @ApiOperation({ summary: "Get all reservations" })
  findAll() {
    return this.reservationsService.findAll()
  }

  @Get(':id')
  @ApiOperation({ summary: "Get a reservation by id" })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.reservationsService.findOne(id)
  }

  @Patch(':id')
  @ApiOperation({ summary: "Update a reservation" })
  @ApiBody({ type: UpdateReservationDto })
  async update(@Param('id', ParseIntPipe) id: number, @Body() updateReservationDto: UpdateReservationDto) {

    const { supplements: lines, ...rest } = updateReservationDto
    const supplements = lines && await this.reservationsService.priceSupplements(lines)
    const updatedReservation = await this.reservationsService.update(id, rest)

    if (supplements) {
      await this.reservationsService.clearSupplements(id)

      await Promise.all(
        supplements.map(supplement =>
          this.reservationsService.addSupplementToReservation(id, supplement)
        )
      )
    }

    return updatedReservation

  }

  @Delete(':id')
  @ApiOperation({ summary: "Delete a reservation by id" })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.reservationsService.remove(id)
  }
}
