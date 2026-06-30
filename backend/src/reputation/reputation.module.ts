import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../prisma/prisma.module';
import { ReputationService } from './reputation.service';
import { ReputationController } from './reputation.controller';
import { ReputationJobs } from './reputation.jobs';

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule],
  providers: [ReputationService, ReputationJobs],
  controllers: [ReputationController],
  exports: [ReputationService],
})
export class ReputationModule {}
