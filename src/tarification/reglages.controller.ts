import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/auth/public.decorator';
import { UpdateReglagesDto } from './dto/update-reglages.dto';
import { ReglagesService } from './reglages.service';

@ApiTags('reglages')
@ApiBearerAuth()
@Controller('reglages')
export class ReglagesController {
  constructor(private readonly reglagesService: ReglagesService) { }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Réglages du gîte : taxe de séjour, capacité, saison, acompte (public)' })
  get() {
    return this.reglagesService.get();
  }

  @Patch()
  @ApiOperation({ summary: 'Modifier les réglages du gîte (champs envoyés seulement)' })
  @ApiBody({ type: UpdateReglagesDto })
  update(@Body() dto: UpdateReglagesDto) {
    return this.reglagesService.update(dto);
  }
}
