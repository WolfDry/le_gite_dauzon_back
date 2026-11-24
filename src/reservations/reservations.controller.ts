import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, Logger, Query } from '@nestjs/common'
import { ListReservationsQueryDto } from './dto/list-reservations-query.dto'
import { Prisma, ReservationSource, ReservationStatut } from '@prisma/client'
import { CreateReservationDto } from './dto/create-reservation.dto'
import { ReservationsService } from './reservations.service'
import { UpdateReservationDto } from './dto/update-reservation.dto'
import { MailGunsService } from 'src/MailGun/mailGun.service'
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger'
import { CreateRequestReservationDto } from './dto/create-request-reservation.dto'
import { Public } from 'src/auth/public.decorator'
import { ThrottlePublicWrite } from 'src/common/throttle'
import { ProtectFromBots } from 'src/common/anti-bot'

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
    const { tarif, debut, fin, adultes, enfants, animaux, clientId, email, nom, prenom, telephone, statut } = createReservationDto
    const validatedClient = {
      nom: nom as string,
      prenom: prenom as string,
      email: email as string,
      telephone: telephone as string,
    }
    const payload: Omit<Prisma.ReservationCreateInput, 'supplements' | 'taxeSejour'> = {
      tarif,
      debut,
      fin,
      adultes,
      enfants,
      animaux,
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
    return this.reservationsService.create(payload, supplements)
  }

  @Public()
  @ThrottlePublicWrite()
  @ProtectFromBots({ id: 0 })
  @Post('/request')
  @ApiOperation({ summary: "Create a reservation request (public, always DEMANDE). 409 if the dates overlap an OPTION or CONFIRMEE stay or blocked dates" })
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
        adultes: dto.adultes,
        enfants: dto.enfants,
        animaux: dto.animaux,
      })
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      this.logger.error(`Mail de la demande de réservation ${reservation.id} non envoyé : ${reason}`)
    }

    return { id: reservation.id }
  }

  @Public()
  @Get('disponibilites')
  @ApiOperation({ summary: "Unavailable periods (OPTION or CONFIRMEE stays and blocked dates) from January 1st of the current year (dates only, public)" })
  findDisponibilites() {
    const startOfYear = new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1))
    return this.reservationsService.findDisponibilites(startOfYear)
  }

  @Get()
  @ApiOperation({ summary: "Reservations overlapping a period (bounds included), optionally filtered by status" })
  findAll(@Query() query: ListReservationsQueryDto) {
    return this.reservationsService.findAll(query)
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
    return this.reservationsService.update(id, rest, supplements)
  }

  @Delete(':id')
  @ApiOperation({ summary: "Delete a reservation by id" })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.reservationsService.remove(id)
  }
}
