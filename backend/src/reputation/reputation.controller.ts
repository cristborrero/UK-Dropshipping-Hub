import { Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { ReputationService } from './reputation.service';

@Controller('reputation')
@UseGuards(JwtAuthGuard)
export class ReputationController {
  constructor(
    private readonly reputationService: ReputationService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * GET /reputation/me
   * Returns the latest KPI snapshot for the authenticated supplier.
   */
  @Get('me')
  async getMyLatest(@Req() req: any) {
    const user: JwtPayload = req.user;
    const supplier = await this.prisma.supplier.findUnique({
      where: { userId: user.sub },
      select: { id: true },
    });
    if (!supplier) return null;
    return this.reputationService.getLatestSnapshot(supplier.id);
  }

  /**
   * GET /reputation/me/history
   * Returns the last 12 snapshots for the authenticated supplier.
   */
  @Get('me/history')
  async getMyHistory(@Req() req: any) {
    const user: JwtPayload = req.user;
    const supplier = await this.prisma.supplier.findUnique({
      where: { userId: user.sub },
      select: { id: true },
    });
    if (!supplier) return [];
    return this.reputationService.getHistory(supplier.id);
  }

  /**
   * GET /reputation/provider/:id
   * Returns the latest KPI snapshot for a supplier (visible to any auth user).
   */
  @Get('provider/:id')
  async getLatest(@Param('id') id: string) {
    return this.reputationService.getLatestSnapshot(id);
  }

  /**
   * GET /reputation/provider/:id/history
   * Returns the last 12 snapshots for trend charts.
   */
  @Get('provider/:id/history')
  async getHistory(@Param('id') id: string) {
    return this.reputationService.getHistory(id);
  }

  /**
   * POST /reputation/run-job
   * Manually triggers the nightly KPI job (dev/testing only).
   */
  @Post('run-job')
  async runJob() {
    return this.reputationService.runDailyJob();
  }
}
