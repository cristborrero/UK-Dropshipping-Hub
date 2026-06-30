import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CatalogueService } from './catalogue.service';
import { CatalogueController } from './catalogue.controller';

@Module({
  imports: [PrismaModule],
  providers: [CatalogueService],
  controllers: [CatalogueController],
  exports: [CatalogueService],
})
export class CatalogueModule {}
