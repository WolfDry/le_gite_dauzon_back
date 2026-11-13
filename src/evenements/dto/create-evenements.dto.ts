import { ApiProperty } from "@nestjs/swagger"
import { EventType } from "@prisma/client"
import { Type } from "class-transformer"
import { IsDate, IsEnum, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from "class-validator"
import { EVENEMENTS_FOLDER } from "src/Upload/Upload.service"

/** L'image doit être un public_id Cloudinary du dossier des événements. */
export const IMAGE_ID_PATTERN = new RegExp(`^${EVENEMENTS_FOLDER}/`)
export const IMAGE_ID_MESSAGE = `image must be a Cloudinary public_id in the '${EVENEMENTS_FOLDER}' folder`

export class CreateEvenementDto {

  constructor(titre: string, image: string, date: Date | null, type: EventType, localisation: string | null, description: string, lien: string | null) {
    this.titre = titre;
    this.image = image;
    this.date = date;
    this.type = type;
    this.localisation = localisation;
    this.description = description;
    this.lien = lien;
  }

  @ApiProperty({ description: 'Event title' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  readonly titre: string;

  @ApiProperty({ description: `Event image (Cloudinary public_id in the '${EVENEMENTS_FOLDER}' folder)` })
  @IsString()
  @Matches(IMAGE_ID_PATTERN, { message: IMAGE_ID_MESSAGE })
  readonly image: string;

  @ApiProperty({ description: 'The date that indicates when the event takes place.', type: String, format: 'date-time', required: false, nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  readonly date?: Date | null

  @ApiProperty({ description: 'Event type', enum: EventType })
  @IsEnum(EventType)
  readonly type: EventType;

  @ApiProperty({ description: 'Event location', required: false, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  readonly localisation?: string | null;

  @ApiProperty({ description: 'Event description' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  readonly description: string;

  @ApiProperty({ description: 'Event link', required: false, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  readonly lien?: string | null;
}
