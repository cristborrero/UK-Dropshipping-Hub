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

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function registerAndLogin(
  app: INestApplication,
  email: string,
  role: 'SUPPLIER' | 'SELLER' | 'ADMIN',
): Promise<{ token: string; userId: string }> {
  // If ADMIN, register as seller first but update role directly in DB (or see if admin register is blocked)
  const regRole = role === 'ADMIN' ? 'SELLER' : role;
  const body: Record<string, string> = {
    email,
    password: 'Pass123!',
    role: regRole,
  };
  if (regRole === 'SUPPLIER') {
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

  if (role === 'ADMIN') {
    const prisma = app.get(PrismaService);
    await prisma.user.update({
      where: { id: reg.body.id },
      data: { role: 'ADMIN' },
    });
  }

  const login = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password: 'Pass123!' });
  expect(login.status).toBe(200);
  return {
    token: login.body.accessToken as string,
    userId: reg.body.id as string,
  };
}

async function seedData(
  prisma: PrismaService,
  supplierId: string,
  sellerId: string,
) {
  // Create products
  await prisma.product.create({
    data: {
      supplierId,
      sku: 'SKU-ANALYTICS-1',
      title: 'P1',
      category: 'Cat',
      wholesalePrice: 100,
    },
  });

  await prisma.product.create({
    data: {
      supplierId,
      sku: 'SKU-ANALYTICS-2',
      title: 'P2',
      category: 'Cat',
      wholesalePrice: 50,
    },
  });

  // Order 1: Delivered (successful payment)
  const o1 = await prisma.order.create({
    data: {
      externalOrderId: 'EXT-A1',
      sellerId,
      supplierId,
      status: 'DELIVERED',
      totalAmount: 100,
    },
  });
  await prisma.transaction.create({
    data: {
      orderId: o1.id,
      stripePaymentIntentId: 'pi_a1',
      sellerId,
      supplierId,
      grossAmount: 100,
      platformFeeAmount: 5,
      sellerNetAmount: 100,
      supplierNetAmount: 95,
      status: 'SUCCEEDED',
    },
  });

  // Order 2: Cancelled & Refunded
  const o2 = await prisma.order.create({
    data: {
      externalOrderId: 'EXT-A2',
      sellerId,
      supplierId,
      status: 'CANCELLED',
      totalAmount: 50,
    },
  });
  await prisma.transaction.create({
    data: {
      orderId: o2.id,
      stripePaymentIntentId: 'pi_a2',
      sellerId,
      supplierId,
      grossAmount: 50,
      platformFeeAmount: 2.5,
      sellerNetAmount: 50,
      supplierNetAmount: 47.5,
      status: 'REFUNDED',
    },
  });

  // Order 3: Pending Supplier (unpaid/no transaction)
  await prisma.order.create({
    data: {
      externalOrderId: 'EXT-A3',
      sellerId,
      supplierId,
      status: 'PENDING_SUPPLIER',
      totalAmount: 120,
    },
  });
}

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('Operator Analytics & Monitoring (Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let adminToken: string;
  let sellerToken: string;
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
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);

    // Seed ADMIN
    const adm = await registerAndLogin(
      app,
      'admin_analytics@test.com',
      'ADMIN',
    );
    adminToken = adm.token;

    // Seed SELLER
    const sel = await registerAndLogin(
      app,
      'seller_analytics@test.com',
      'SELLER',
    );
    sellerToken = sel.token;
    const sellerProfile = await prisma.seller.findUnique({
      where: { userId: sel.userId },
    });
    sellerId = sellerProfile!.id;

    // Seed SUPPLIER
    const sup = await registerAndLogin(
      app,
      'supplier_analytics@test.com',
      'SUPPLIER',
    );
    const supplierProfile = await prisma.supplier.findUnique({
      where: { userId: sup.userId },
    });
    supplierId = supplierProfile!.id;

    // Seed data
    await seedData(prisma, supplierId, sellerId);
  });

  // ── 1. Role Authorization Checks ──────────────────────────────────────────
  describe('Authorization Role Guards', () => {
    it('blocks access to non-ADMIN users (SELLER)', async () => {
      const res = await request(app.getHttpServer())
        .get('/analytics/platform/current')
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Insufficient permissions');
    });

    it('allows access to ADMIN users', async () => {
      const res = await request(app.getHttpServer())
        .get('/analytics/platform/current')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('gmv');
    });
  });

  // ── 2. KPI Correctness ─────────────────────────────────────────────────────
  describe('KPI Calculations Accuracy', () => {
    it('computes correct financial metrics on the snapshot', async () => {
      const res = await request(app.getHttpServer())
        .get('/analytics/platform/current')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);

      // GMV = 100 + 50 = 150
      expect(res.body.gmv).toBe(150);

      // Net Sales = GMV - Refunded (150 - 50) = 100
      expect(res.body.netSales).toBe(100);

      // Refund Rate = (50 / 150) * 100 = 33.33%
      expect(res.body.refundRate).toBe(33.33);

      // Platform Fees Total = sum of succeeded fees = 5 (refunded transaction is not succeeded)
      expect(res.body.platformFeesTotal).toBe(5);
    });

    it('computes correct order status distributions', async () => {
      const res = await request(app.getHttpServer())
        .get('/analytics/platform/current')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);

      expect(res.body.ordersTotal).toBe(3);
      expect(res.body.ordersByStatusPending).toBe(1); // EXT-A3
      expect(res.body.ordersByStatusAccepted).toBe(0);
      expect(res.body.ordersByStatusShipped).toBe(0);
      expect(res.body.ordersByStatusDelivered).toBe(1); // EXT-A1
      expect(res.body.ordersByStatusCancelled).toBe(1); // EXT-A2
    });

    it('computes active suppliers and sellers count correctly', async () => {
      const res = await request(app.getHttpServer())
        .get('/analytics/platform/current')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.suppliersActiveCount).toBe(1);
      expect(res.body.sellersActiveCount).toBe(1);
    });
  });

  // ── 3. Top Performers Lookups ──────────────────────────────────────────────
  describe('GET /analytics/platform/top-performers', () => {
    it('returns lists of top performing suppliers and sellers', async () => {
      const res = await request(app.getHttpServer())
        .get('/analytics/platform/top-performers')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('suppliers');
      expect(res.body).toHaveProperty('sellers');
      expect(Array.isArray(res.body.suppliers)).toBe(true);
      expect(Array.isArray(res.body.sellers)).toBe(true);

      // Our supplier has 100 succeeded gmv
      expect(res.body.suppliers[0].gmv).toBe(100);
      expect(res.body.sellers[0].gmv).toBe(100);
    });
  });

  // ── 4. Daily Job Calculation Trigger ────────────────────────────────────────
  describe('POST /analytics/run-job', () => {
    it('manually runs daily snapshot and saves snapshot successfully', async () => {
      const run = await request(app.getHttpServer())
        .post('/analytics/run-job')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(run.status).toBe(201);
      expect(run.body).toHaveProperty('id');

      // Now query history to check it was saved
      const hist = await request(app.getHttpServer())
        .get('/analytics/platform/history')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(hist.status).toBe(200);
      expect(hist.body.length).toBeGreaterThan(0);
    });
  });
});
