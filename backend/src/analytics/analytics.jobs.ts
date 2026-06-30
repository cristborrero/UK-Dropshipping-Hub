import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AnalyticsService } from './analytics.service';

@Injectable()
export class AnalyticsJobs {
  private readonly logger = new Logger(AnalyticsJobs.name);

  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * Runs nightly at 03:00 UTC.
   * Recomputes and persists platform metrics for yesterday's 24h window.
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleNightlyPlatformKpiJob() {
    this.logger.log('[AnalyticsJob] Nightly platform KPI calculation started');
    const snapshot = await this.analyticsService.runDailySnapshotJob();
    this.logger.log(
      `[AnalyticsJob] Completed. Persisted snapshot ID ${snapshot.id} with GMV: £${snapshot.gmv}`,
    );
  }
}
