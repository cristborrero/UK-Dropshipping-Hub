import 'dotenv/config';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { json } from 'body-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import * as cookieParser from 'cookie-parser';

export async function createTestApp(): Promise<{
  app: INestApplication;
  prisma: PrismaService;
}> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();

  const cookieParserFn = (cookieParser as any).default || cookieParser;
  app.use(cookieParserFn());

  // Capture raw body buffer for store webhook signature verification in test app
  app.use(
    json({
      verify: (req: any, _res, buf) => {
        if (req.originalUrl && req.originalUrl.includes('/webhooks')) {
          req.rawBody = buf;
        }
      },
    }),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.init();

  const prisma = app.get(PrismaService);

  return { app, prisma };
}

export async function cleanDatabase(prisma: PrismaService): Promise<void> {
  // Order of deletion matters due to FK constraints
  await prisma.providerKpiSnapshot.deleteMany({});
  await prisma.platformKpiSnapshot.deleteMany({});
  await prisma.sellerProductImport.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.notificationPreference.deleteMany({});
  await prisma.transaction.deleteMany({});
  await prisma.wallet.deleteMany({});
  await prisma.returnRequest.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.inventory.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.supplier.deleteMany({});
  await prisma.seller.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.apiClient.deleteMany({});
}
