import {
  Controller,
  Post,
  Body,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';

@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('checkout-session')
  @Roles(UserRole.SELLER)
  async checkoutSession(
    @Body() dto: CreatePaymentIntentDto,
    @CurrentUser() userPayload: unknown,
  ) {
    const user = userPayload as JwtPayload;

    const seller = await this.prisma.seller.findUnique({
      where: { userId: user.sub },
    });

    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    return this.paymentsService.createPaymentIntent(dto, seller.id);
  }
}
