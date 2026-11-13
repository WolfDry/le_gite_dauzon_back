import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsBoolean, IsDate, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export class CreateCommentaireDto {

  constructor(commentaire: string, name: string, note: number, verif?: boolean, created?: Date) {
    this.commentaire = commentaire;
    this.name = name;
    this.note = note;
    this.verif = verif;
    this.created = created;
  }

  @ApiProperty({ description: 'Comment content' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(3000)
  readonly commentaire: string;

  @ApiProperty({ description: 'Last name and first name of the person adding the comment' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  readonly name: string;

  @ApiProperty({ description: 'Rating from 1 to 5 (0 = no rating, admin only)', minimum: 0, maximum: 5 })
  @IsInt()
  @Min(0)
  @Max(5)
  readonly note: number;

  @ApiProperty({ description: 'Comment validated (admin only, ignored for visitors)', required: false })
  @IsOptional()
  @IsBoolean()
  readonly verif?: boolean;

  @ApiProperty({ description: 'Date of the comment (admin only, ignored for visitors)', type: String, format: 'date', required: false })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  readonly created?: Date;
}
