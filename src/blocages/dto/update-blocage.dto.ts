import { PartialType } from '@nestjs/swagger'
import { CreateBlocageDto } from './create-blocage.dto'

export class UpdateBlocageDto extends PartialType(CreateBlocageDto) {}
