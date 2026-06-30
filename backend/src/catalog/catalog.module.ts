import { Module } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { CatalogController } from './catalog.controller';
import { CsvParserService } from './csv-parser.service';

@Module({
  controllers: [CatalogController],
  providers: [CatalogService, CsvParserService],
  exports: [CatalogService],
})
export class CatalogModule {}
