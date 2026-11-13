import { ApiProperty } from "@nestjs/swagger"
import { EventType } from "@prisma/client"
import { Type } from "class-transformer"
import { IsDate, IsEnum, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from "class-validator"
import { IMAGE_ID_MESSAGE, IMAGE_ID_PATTERN } from "./create-evenements.dto"

export class UpdateEvenementDto {

  @ApiProperty({ description: 'Event title', required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  readonly titre?: string;

  @ApiProperty({ description: 'Event image (Cloudinary public_id)', required: false })
  @IsOptional()
  @IsString()
  @Matches(IMAGE_ID_PATTERN, { message: IMAGE_ID_MESSAGE })
  readonly image?: string;

  @ApiProperty({ description: 'The date that indicates when the event takes place.', type: String, format: 'date-time', required: false, nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  readonly date?: Date | null;

  @ApiProperty({ description: 'Event type', enum: EventType, required: false })
  @IsOptional()
  @IsEnum(EventType)
  readonly type?: EventType;

  @ApiProperty({ description: 'Event location', required: false, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  readonly localisation?: string | null;

  @ApiProperty({ description: 'Event description', required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  readonly description?: string;

  @ApiProperty({ description: 'Event link', required: false, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  readonly lien?: string | null;
}
