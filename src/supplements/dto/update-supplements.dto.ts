import { ApiProperty } from "@nestjs/swagger"
import { SupplementType } from "@prisma/client"
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator"
import { IsMontant } from "src/common/validation"

export class UpdateSupplementDto {
  @ApiProperty({ description: 'Label of a supplement (unique)', required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  readonly label?: string;

  @ApiProperty({ description: 'Price of a supplement, in euros (0 accepted)', required: false })
  @IsOptional()
  @IsMontant()
  readonly tarif?: number;

  @ApiProperty({ description: 'Billing type', enum: SupplementType, required: false })
  @IsOptional()
  @IsEnum(SupplementType)
  readonly type?: SupplementType;

  @ApiProperty({ description: 'Billed per animal: added automatically to website requests with animals (only one supplement at a time)', required: false })
  @IsOptional()
  @IsBoolean()
  readonly parAnimal?: boolean;
}
