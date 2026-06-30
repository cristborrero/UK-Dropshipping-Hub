import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * GET /analytics/platform/current
   * Returns a live snapshot computed for the last 30 days.
   */
  @Get('platform/current')
  async getCurrentSnapshot() {
    const windowEnd = new Date();
    const windowStart = new Date(windowEnd);
    windowStart.setDate(windowStart.getDate() - 30);
    return this.analyticsService.computeAndSave(windowStart, windowEnd);
  }

  /**
   * GET /analytics/platform/history
   * Returns the historical persisted snapshots for operators.
   */
  @Get('platform/history')
  async getHistory() {
    return this.analyticsService.getHistory();
  }

  /**
   * GET /analytics/platform/top-performers
   * Returns top suppliers and sellers by volume and performance metrics.
   */
  @Get('platform/top-performers')
  async getTopPerformers() {
    return this.analyticsService.getTopPerformers();
  }

  /**
   * POST /analytics/run-job
   * Manually runs the daily snapshot calculation (dev / operator use).
   */
  @Post('run-job')
  async runJob() {
    return this.analyticsService.runDailySnapshotJob();
  }
}
