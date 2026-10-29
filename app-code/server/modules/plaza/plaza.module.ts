import { Module } from '@nestjs/common';
import { PlazaController } from './plaza.controller';
import { PlazaService } from './plaza.service';

@Module({
  controllers: [PlazaController],
  providers: [PlazaService],
  exports: [PlazaService],
})
export class PlazaModule {}
