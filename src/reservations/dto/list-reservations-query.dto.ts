import { ApiPropertyOptional } from '@nestjs/swagger'
import { ReservationStatut } from '@prisma/client'
import { Transform, Type } from 'class-transformer'
import { IsArray, IsDate, IsEnum, IsIn, IsOptional } from 'class-validator'

export const VUES_RESERVATIONS = ['liste', 'apercu'] as const
export type VueReservations = (typeof VUES_RESERVATIONS)[number]

/** `?statut=DEMANDE,OPTION` ou `?statut=DEMANDE&statut=OPTION`. */
const toList = ({ value }: { value: unknown }): unknown[] =>
  (Array.isArray(value) ? (value as unknown[]) : [value])
    .flatMap((v): unknown[] => (typeof v === 'string' ? v.split(',').map((s) => s.trim()) : [v]))
    .filter((v) => v !== '')

export class ListReservationsQueryDto {
  @ApiPropertyOptional({
    description: 'Séjours dont le départ est à cette date ou après (AAAA-MM-JJ)',
    type: String,
    format: 'date',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  readonly depuis?: Date

  @ApiPropertyOptional({
    description: "Séjours dont l'arrivée est à cette date ou avant (AAAA-MM-JJ)",
    type: String,
    format: 'date',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  readonly jusqua?: Date

  @ApiPropertyOptional({
    description: 'Statuts à garder, séparés par des virgules',
    enum: ReservationStatut,
    isArray: true,
  })
  @IsOptional()
  @Transform(toList)
  @IsArray()
  @IsEnum(ReservationStatut, { each: true })
  readonly statut?: ReservationStatut[]

  @ApiPropertyOptional({
    description:
      "Champs renvoyés : `liste` (tableau et totaux, par défaut) ou `apercu` (id, dates, statut et nom, pour un calendrier ou un compteur)",
    enum: VUES_RESERVATIONS,
  })
  @IsOptional()
  @IsIn(VUES_RESERVATIONS)
  readonly vue?: VueReservations
}
