import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/auth/public.decorator';
import { DevisService } from './devis.service';
import { DevisDto } from './dto/devis.dto';

@ApiTags('devis')
@Controller('devis')
export class DevisController {
  constructor(private readonly devisService: DevisService) { }

  /** Public : n'écrit rien et ne renvoie que des prix déjà publiés sur le site. */
  @Public()
  @Post()
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Prix détaillé d’un séjour : hébergement (tarif des périodes ou prix imposé), taxe de séjour, suppléments, acompte (public)',
  })
  @ApiBody({ type: DevisDto })
  devis(@Body() dto: DevisDto) {
    return this.devisService.devis(dto);
  }
}
