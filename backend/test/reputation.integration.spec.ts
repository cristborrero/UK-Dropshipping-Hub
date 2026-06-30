import 'dotenv/config';
import { describe, beforeAll, afterAll, beforeEach, it, expect } from 'vitest';
import request from 'supertest';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import * as cookieParser from 'cookie-parser';
import { json } from 'body-parser';
import { cleanDatabase } from './test-helper';
import { PrismaService } from '../src/prisma/prisma.service';
import { AppModule } from '../src/app.module';
import { EventsProcessor } from '../src/events/events.processor';
import { NotificationsProcessor } from '../src/notifications/notifications.processor';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ReputationService } from '../src/reputation/reputation.service';
import { ReputationLevel } from '@prisma/client';

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function registerAndLogin(
  app: INestApplication,
  email: string,
  role: 'SUPPLIER' | 'SELLER',
): Promise<{ token: string; userId: string }> {
  const body: Record<string, string> = { email, password: 'Pass123!', role };
  if (role === 'SUPPLIER') {
    body.companyName = 'Test Supplier Co';
    body.vat = 'GB999';
    body.address = '1 Test Lane, London';
  } else {
    body.storePlatform = 'SHOPIFY';
    body.storeUrl = 'https://test-store.myshopify.com';
  }

  const reg = await request(app.getHttpServer())
    .post('/auth/register')
    .send(body);
  expect(reg.status).toBe(201);

  const login = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password: 'Pass123!' });
  expect(login.status).toBe(200);
  return {
    token: login.body.accessToken as string,
    userId: reg.body.id as string,
  };
}

// Inserts an order with a given status for the supplier.
async function seedOrder(
  prisma: PrismaService,
  supplierId: string,
  sellerId: string,
  status: string,
) {
  const product = await prisma.product.create({
    data: {
      supplierId,
      sku: `SKU-REP-${Math.random().toString(36).slice(2)}`,
      title: 'Test Product',
      category: 'Test',
      wholesalePrice: 10,
    },
  });

  await prisma.inventory.create({
    data: { productId: product.id, stock: 100, slaDays: 3 },
  });

  return prisma.order.create({
    data: {
      externalOrderId: `EXT-${Math.random().toString(36).slice(2)}`,
      sellerId,
      supplierId,
      totalAmount: 10,
      status: status as any,
    },
  });
}

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('Reputation & KPI (Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let reputationService: ReputationService;

  let supplierToken: string;
  let supplierId: string;
  let sellerId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(getQueueToken('order-events'))
      .useValue({ add: async () => {} })
      .overrideProvider(EventsProcessor)
      .useValue({})
      .overrideProvider(NotificationsProcessor)
      .useValue({})
      .compile();

    app = moduleFixture.createNestApplication();
    const cookieParserFn = (cookieParser as any).default || cookieParser;
    app.use(cookieParserFn());
    app.use(
      json({
        verify: (req: any, _res, buf) => {
          if (req.originalUrl?.includes('/webhooks')) req.rawBody = buf;
        },
      }),
    );
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();

    prisma = moduleFixture.get(PrismaService);
    reputationService = moduleFixture.get(ReputationService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);

    // Seed supplier
    const sup = await registerAndLogin(
      app,
      'rep-supplier@test.com',
      'SUPPLIER',
    );
    supplierToken = sup.token;
    const supplierProfile = await prisma.supplier.findUnique({
      where: { userId: sup.userId },
    });
    // Activate supplier so the nightly job processes it
    await prisma.supplier.update({
      where: { id: supplierProfile!.id },
      data: { status: 'ACTIVE' },
    });
    supplierId = supplierProfile!.id;

    // Seed seller
    const sel = await registerAndLogin(app, 'rep-seller@test.com', 'SELLER');
    const sellerProfile = await prisma.seller.findUnique({
      where: { userId: sel.userId },
    });
    sellerId = sellerProfile!.id;
  });

  // ── 1. GET /reputation/provider/:id ────────────────────────────────────────
  describe('GET /reputation/provider/:id', () => {
    it('returns empty/null when no snapshot exists yet', async () => {
      const res = await request(app.getHttpServer())
        .get(`/reputation/provider/${supplierId}`)
        .set('Authorization', `Bearer ${supplierToken}`);

      expect(res.status).toBe(200);
      // NestJS serialises Prisma null as {}; ensure no snapshot data is present
      expect(res.body?.id).toBeUndefined();
    });

    it('returns the latest snapshot after job has run', async () => {
      // Seed 10 perfect orders (DELIVERED)
      for (let i = 0; i < 10; i++) {
        await seedOrder(prisma, supplierId, sellerId, 'DELIVERED');
      }

      // Run computation directly
      await reputationService.computeAndSave(supplierId);

      const res = await request(app.getHttpServer())
        .get(`/reputation/provider/${supplierId}`)
        .set('Authorization', `Bearer ${supplierToken}`);

      expect(res.status).toBe(200);
      expect(res.body).not.toBeNull();
      expect(res.body.supplierId).toBe(supplierId);
      expect(res.body.ordersTotal).toBe(10);
      expect(res.body.reputationScore).toBeGreaterThan(0);
    });
  });

  // ── 2. KPI correctness ─────────────────────────────────────────────────────
  describe('KPI correctness', () => {
    it('assigns PREMIUM to a supplier with all delivered orders', async () => {
      // 10 delivered orders → OTD=100, Fill=100, Cancel=0, Return=0 → score=100
      for (let i = 0; i < 10; i++) {
        await seedOrder(prisma, supplierId, sellerId, 'DELIVERED');
      }

      const snapshot = await reputationService.computeAndSave(supplierId);

      expect(snapshot.otdPercentage).toBe(100);
      expect(snapshot.fillRatePercentage).toBe(100);
      expect(snapshot.cancelRatePercentage).toBe(0);
      expect(snapshot.returnRatePercentage).toBe(0);
      expect(snapshot.reputationScore).toBe(100);
      expect(snapshot.level).toBe(ReputationLevel.PREMIUM);
    });

    it('penalises cancellations correctly', async () => {
      // 8 delivered + 2 cancelled
      for (let i = 0; i < 8; i++) {
        await seedOrder(prisma, supplierId, sellerId, 'DELIVERED');
      }
      for (let i = 0; i < 2; i++) {
        await seedOrder(prisma, supplierId, sellerId, 'CANCELLED');
      }

      const snapshot = await reputationService.computeAndSave(supplierId);

      expect(snapshot.cancelRatePercentage).toBe(20);
      expect(snapshot.fillRatePercentage).toBe(80);
      // score = 0.4*80 + 0.2*80 + 0.2*80 + 0.2*100 = 32+16+16+20 = 84
      expect(snapshot.reputationScore).toBe(84);
      expect(snapshot.level).toBe(ReputationLevel.VERIFIED);
    });

    it('penalises returns correctly', async () => {
      // 9 delivered + 1 return_approved
      for (let i = 0; i < 9; i++) {
        await seedOrder(prisma, supplierId, sellerId, 'DELIVERED');
      }
      await seedOrder(prisma, supplierId, sellerId, 'RETURN_APPROVED');

      const snapshot = await reputationService.computeAndSave(supplierId);

      expect(snapshot.returnRatePercentage).toBe(10);
      expect(snapshot.level).toBe(ReputationLevel.PREMIUM); // still high
    });

    it('does not produce PREMIUM when ordersTotal < 3', async () => {
      // Only 2 orders — below minimum threshold
      await seedOrder(prisma, supplierId, sellerId, 'DELIVERED');
      await seedOrder(prisma, supplierId, sellerId, 'DELIVERED');

      const snapshot = await reputationService.computeAndSave(supplierId);

      expect(snapshot.ordersTotal).toBe(2);
      expect(snapshot.level).toBe(ReputationLevel.STANDARD);
    });

    it('assigns STANDARD for supplier with many cancellations', async () => {
      // 3 delivered + 7 cancelled → score well below 75
      for (let i = 0; i < 3; i++) {
        await seedOrder(prisma, supplierId, sellerId, 'DELIVERED');
      }
      for (let i = 0; i < 7; i++) {
        await seedOrder(prisma, supplierId, sellerId, 'CANCELLED');
      }

      const snapshot = await reputationService.computeAndSave(supplierId);

      expect(snapshot.level).toBe(ReputationLevel.STANDARD);
    });
  });

  // ── 3. History endpoint ────────────────────────────────────────────────────
  describe('GET /reputation/provider/:id/history', () => {
    it('returns snapshots in reverse chronological order', async () => {
      for (let i = 0; i < 5; i++) {
        await seedOrder(prisma, supplierId, sellerId, 'DELIVERED');
      }
      // Create two snapshots
      await reputationService.computeAndSave(supplierId);
      await reputationService.computeAndSave(supplierId);

      const res = await request(app.getHttpServer())
        .get(`/reputation/provider/${supplierId}/history`)
        .set('Authorization', `Bearer ${supplierToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
    });
  });

  // ── 4. Nightly job (POST /reputation/run-job) ──────────────────────────────
  describe('POST /reputation/run-job', () => {
    it('processes all active suppliers and returns count', async () => {
      const res = await request(app.getHttpServer())
        .post('/reputation/run-job')
        .set('Authorization', `Bearer ${supplierToken}`);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('processed');
      expect(typeof res.body.processed).toBe('number');
    });
  });
});
