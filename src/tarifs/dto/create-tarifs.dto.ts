import { ApiProperty } from "@nestjs/swagger"
import { TarifFrequence } from "@prisma/client"
import { IsArray, IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator"
import { IsMontant } from "src/common/validation"
import { IsPeriodes, PeriodeDto } from "./periode.dto"

export class CreateTarifsDto {

  constructor(desc: string, label: string, date: string[] | undefined, vacance: boolean | undefined, prix: number, frequence: TarifFrequence[]) {
    this.desc = desc;
    this.label = label;
    this.date = date;
    this.vacance = vacance;
    this.prix = prix;
    this.frequence = frequence;
  }

  @ApiProperty({ description: 'Description of a tarif (may be empty)' })
  @IsString()
  @MaxLength(1000)
  readonly desc: string

  @ApiProperty({ description: 'Label of a tarif (unique)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  readonly label: string

  @ApiProperty({ description: 'Former free-text periods, displayed while the tarif has no dated period', type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  readonly date?: string[]

  @ApiProperty({ description: 'Tarif is during vacance', required: false })
  @IsOptional()
  @IsBoolean()
  readonly vacance?: boolean

  @ApiProperty({ description: 'Price of a tarif, in euros (0 accepted)' })
  @IsMontant()
  readonly prix: number

  @ApiProperty({ description: 'Frequency of a tarif', enum: TarifFrequence, isArray: true })
  @IsArray()
  @IsEnum(TarifFrequence, { each: true })
  readonly frequence: TarifFrequence[]

  @ApiProperty({
    description: 'Dated periods (nights from debut to fin, fin excluded). Replace all the periods of the tarif and clear the free text',
    type: [PeriodeDto],
    required: false,
  })
  @IsOptional()
  @IsPeriodes()
  readonly periodes?: PeriodeDto[]

  @ApiProperty({
    description: 'Weekly tarif of the nights no period covers (low season). Marking one unmarks the others',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  readonly parDefaut?: boolean
}
