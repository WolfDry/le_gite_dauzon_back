import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsDate, IsOptional } from 'class-validator'

export class ListBlocagesQueryDto {
  @ApiPropertyOptional({ description: 'Blocages qui finissent à cette date ou après (AAAA-MM-JJ)', type: String, format: 'date' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  readonly depuis?: Date

  @ApiPropertyOptional({ description: 'Blocages qui commencent à cette date ou avant (AAAA-MM-JJ)', type: String, format: 'date' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  readonly jusqua?: Date
}
