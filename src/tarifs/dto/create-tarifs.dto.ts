import { ApiProperty } from "@nestjs/swagger"
import { TarifFrequence } from "@prisma/client"
import { IsArray, IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min } from "class-validator"

export class CreateTarifsDto {

  constructor(desc: string, label: string, date: string[], vacance: boolean | undefined, prix: number, frequence: TarifFrequence[]) {
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

  @ApiProperty({ description: 'Periods of a tarif, displayed as is', type: [String] })
  @IsArray()
  @IsString({ each: true })
  readonly date: string[]

  @ApiProperty({ description: 'Tarif is during vacance', required: false })
  @IsOptional()
  @IsBoolean()
  readonly vacance?: boolean

  @ApiProperty({ description: 'Price of a tarif (0 accepted)' })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  readonly prix: number

  @ApiProperty({ description: 'Frequency of a tarif', enum: TarifFrequence, isArray: true })
  @IsArray()
  @IsEnum(TarifFrequence, { each: true })
  readonly frequence: TarifFrequence[]
}
