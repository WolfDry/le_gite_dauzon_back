import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { Equals, IsEmail, IsNotEmpty, IsString, MaxLength, ValidateNested } from 'class-validator'
import { AntiBotDto } from 'src/common/anti-bot'

export class ContactContentDto {

  constructor(name: string, email: string, message: string) {
    this.name = name;
    this.email = email;
    this.message = message;
  }

  @ApiProperty({ description: 'Nom de la personne' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  readonly name: string

  @ApiProperty({ description: 'E-mail de la personne' })
  @IsEmail()
  @MaxLength(254)
  readonly email: string

  @ApiProperty({ description: 'Message' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  readonly message: string
}

export class ContactDto extends AntiBotDto {

  constructor(subject: 'autre', content: ContactContentDto) {
    super();
    this.subject = subject;
    this.content = content;
  }

  @ApiProperty({ description: 'Sujet du mail', enum: ['autre'] })
  @Equals('autre')
  readonly subject: 'autre'

  @ApiProperty({ type: ContactContentDto })
  @ValidateNested()
  @Type(() => ContactContentDto)
  readonly content: ContactContentDto
}
