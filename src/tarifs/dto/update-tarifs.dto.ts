import { TarifFrequence } from "@prisma/client"

export class UpdateTarifsDto {
  readonly desc?: string
  readonly label?: string
  readonly start_date?: Date[]
  readonly end_date?: Date[]
  readonly vacance?: boolean
  readonly prix?: number
  readonly frequence?: TarifFrequence[]
}