import { ApiProperty } from "@nestjs/swagger";

export class CreateCommentaireDto {
  
  @ApiProperty({ description: 'Comment content' })
  readonly commentaire: string;
  
  @ApiProperty({ description: 'Last name of the person adding the comment' })
  readonly nom: string;
  
  @ApiProperty({ description: 'First name of the person adding the comment' })
  readonly prenom: string;
  
  @ApiProperty({ description: 'Rating related to comment' })
  readonly note: number;
}