import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ReputationService } from './reputation.service';

@Injectable()
export class ReputationJobs {
  private readonly logger = new Logger(ReputationJobs.name);

  constructor(private readonly reputationService: ReputationService) {}

  /**
   * Runs every night at 02:00 UTC.
   * Computes KPI snapshots for every ACTIVE supplier.
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleNightlyJob() {
    this.logger.log('[ReputationJob] Nightly KPI job started');
    const result = await this.reputationService.runDailyJob();
    this.logger.log(
      `[ReputationJob] Completed. Processed ${result.processed} suppliers.`,
    );
  }
}
