import { ApiProperty } from "@nestjs/swagger";

export class CreateCommentaireDto {

  @ApiProperty({ description: 'Comment content' })
  readonly commentaire: string;

  @ApiProperty({ description: 'Last name and first name of the person adding the comment' })
  readonly name: string;

  @ApiProperty({ description: 'Rating related to comment' })
  readonly note: number;

  @ApiProperty({ description: 'verification of the comment' })
  readonly verif: boolean | null;

  @ApiProperty({ description: 'Timestamp of when the comment was created' })
  readonly created: Date | null;
}