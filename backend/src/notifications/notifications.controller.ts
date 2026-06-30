import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async getNotifications(
    @CurrentUser() user: JwtPayload,
    @Query('page') pageStr?: string,
    @Query('pageSize') pageSizeStr?: string,
  ) {
    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const pageSize = pageSizeStr ? parseInt(pageSizeStr, 10) : 10;
    return this.notificationsService.getUserNotifications(
      user.sub,
      page,
      pageSize,
    );
  }

  @Patch('read-all')
  async markAllAsRead(@CurrentUser() user: JwtPayload) {
    await this.notificationsService.markAllAsRead(user.sub);
    return { success: true };
  }

  @Patch(':id/read')
  async markAsRead(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    await this.notificationsService.markAsRead(user.sub, id);
    return { success: true };
  }

  @Get('preferences')
  async getPreferences(@CurrentUser() user: JwtPayload) {
    return this.notificationsService.getPreferences(user.sub);
  }

  @Patch('preferences')
  async updatePreferences(@CurrentUser() user: JwtPayload, @Body() body: any) {
    const updated = await this.notificationsService.updatePreferences(
      user.sub,
      body,
    );
    return { success: true, preferences: updated };
  }
}
