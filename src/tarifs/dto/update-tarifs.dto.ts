import { ApiProperty } from "@nestjs/swagger"
import { TarifFrequence } from "@prisma/client"
import { IsArray, IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min } from "class-validator"

export class UpdateTarifsDto {

  @ApiProperty({ description: 'Description of a tarif (may be empty)', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  readonly desc?: string

  @ApiProperty({ description: 'Label of a tarif (unique)', required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  readonly label?: string

  @ApiProperty({ description: 'Periods of a tarif, displayed as is', type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  readonly date?: string[]

  @ApiProperty({ description: 'Tarif is during vacance', required: false })
  @IsOptional()
  @IsBoolean()
  readonly vacance?: boolean

  @ApiProperty({ description: 'Price of a tarif (0 accepted)', required: false })
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  readonly prix?: number

  @ApiProperty({ description: 'Frequency of a tarif', enum: TarifFrequence, isArray: true, required: false })
  @IsOptional()
  @IsArray()
  @IsEnum(TarifFrequence, { each: true })
  readonly frequence?: TarifFrequence[]
}
