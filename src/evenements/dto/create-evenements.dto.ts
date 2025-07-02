import { ApiProperty } from "@nestjs/swagger"
import { EventType } from "@prisma/client"

export class CreateEvenementDto {

  @ApiProperty({ description: 'Event title' })
  readonly titre: string;

  @ApiProperty({ description: 'Event image' })
  readonly image: string;

  @ApiProperty({ description: 'The date that indicates when the event takes place.' })
  readonly date: Date

  @ApiProperty({ description: 'Event type' })
  readonly type: EventType;

  @ApiProperty({ description: 'Event location' })
  readonly localisation?: string;

  @ApiProperty({ description: 'Event description' })
  readonly description: string;

  @ApiProperty({ description: 'Event link' })
  readonly lien?: string;
}