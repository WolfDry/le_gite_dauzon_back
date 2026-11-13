import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsBoolean, IsDate, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export class UpdateCommentaireDto {

  @ApiProperty({ description: 'Comment validated', required: false })
  @IsOptional()
  @IsBoolean()
  readonly verif?: boolean;

  @ApiProperty({ description: 'Comment content', required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(3000)
  readonly commentaire?: string;

  @ApiProperty({ description: 'Last name and first name of the person adding the comment', required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  readonly name?: string;

  @ApiProperty({ description: 'Rating from 0 (no rating) to 5', required: false, minimum: 0, maximum: 5 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(5)
  readonly note?: number;

  @ApiProperty({ description: 'Date of the comment', type: String, format: 'date', required: false })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  readonly created?: Date;
}
