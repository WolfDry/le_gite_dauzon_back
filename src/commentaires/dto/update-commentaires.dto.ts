import { ApiProperty } from "@nestjs/swagger";

export class UpdateCommentaireDto {

  @ApiProperty({ description: 'Comment checkings' })
  readonly verif?: boolean;

  @ApiProperty({ description: 'Comment content' })
  readonly commentaire?: string;

  @ApiProperty({ description: 'Last name and first name of the person adding the comment' })
  readonly name?: string;

  @ApiProperty({ description: 'Rating related to comment' })
  readonly note?: number;
}