import { ApiProperty } from "@nestjs/swagger"
import { SupplementType } from "@prisma/client"
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from "class-validator"

export class UpdateSupplementDto {
  @ApiProperty({ description: 'Label of a supplement (unique)', required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  readonly label?: string;

  @ApiProperty({ description: 'Price of a supplement (0 accepted)', required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  readonly tarif?: number;

  @ApiProperty({ description: 'Billing type', enum: SupplementType, required: false })
  @IsOptional()
  @IsEnum(SupplementType)
  readonly type?: SupplementType;
}
