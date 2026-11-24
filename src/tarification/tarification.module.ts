import { Module } from '@nestjs/common';
import { DevisController } from './devis.controller';
import { DevisService } from './devis.service';
import { ReglagesController } from './reglages.controller';
import { ReglagesService } from './reglages.service';

/** Règle de prix (B-F4) : réglages du gîte et devis, seule source de vérité pour l'admin et le site. */
@Module({
  controllers: [ReglagesController, DevisController],
  providers: [ReglagesService, DevisService],
  exports: [ReglagesService],
})
export class TarificationModule {}
