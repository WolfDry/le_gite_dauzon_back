import { ApiProperty } from "@nestjs/swagger"
import { SupplementType } from "@prisma/client"
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator"
import { IsMontant } from "src/common/validation"

export class CreateSupplementDto {

  constructor(label: string, tarif: number, type: SupplementType, parAnimal?: boolean) {
    this.label = label;
    this.tarif = tarif;
    this.type = type;
    this.parAnimal = parAnimal;
  }

  @ApiProperty({ description: 'Label of a supplement (unique)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  readonly label: string;

  @ApiProperty({ description: 'Price of a supplement, in euros (0 accepted)' })
  @IsMontant()
  readonly tarif: number;

  @ApiProperty({ description: 'Billing type', enum: SupplementType })
  @IsEnum(SupplementType)
  readonly type: SupplementType;

  @ApiProperty({ description: 'Billed per animal: added automatically to website requests with animals (only one supplement at a time)', required: false })
  @IsOptional()
  @IsBoolean()
  readonly parAnimal?: boolean;
}
