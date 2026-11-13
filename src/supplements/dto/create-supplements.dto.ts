import { ApiProperty } from "@nestjs/swagger"
import { SupplementType } from "@prisma/client"
import { IsEnum, IsInt, IsNotEmpty, IsString, MaxLength, Min } from "class-validator"

export class CreateSupplementDto {

  constructor(label: string, tarif: number, type: SupplementType) {
    this.label = label;
    this.tarif = tarif;
    this.type = type;
  }

  @ApiProperty({ description: 'Label of a supplement (unique)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  readonly label: string;

  @ApiProperty({ description: 'Price of a supplement (0 accepted)' })
  @IsInt()
  @Min(0)
  readonly tarif: number;

  @ApiProperty({ description: 'Billing type', enum: SupplementType })
  @IsEnum(SupplementType)
  readonly type: SupplementType;
}
