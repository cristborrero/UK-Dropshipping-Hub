import {
  vi,
  describe,
  beforeAll,
  afterAll,
  beforeEach,
  it,
  expect,
} from 'vitest';
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
import { NotificationsService } from '../src/notifications/notifications.service';
import { NotificationsProcessor } from '../src/notifications/notifications.processor';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransactionStatus } from '@prisma/client';

// Mock Stripe globally using constructor-safe class
vi.mock('stripe', () => {
  class MockStripe {
    paymentIntents = {
      create: vi.fn().mockImplementation(async (data: any) => {
        return {
          id: 'pi_mock_12345',
          client_secret: 'pi_mock_12345_secret',
          amount: data.amount,
          currency: data.currency,
          metadata: data.metadata,
        };
      }),
    };
    webhooks = {
      constructEvent: vi
        .fn()
        .mockImplementation((rawBody: any, signature: string) => {
          if (signature === 'invalid_signature') {
            throw new Error('Invalid signature');
          }
          return JSON.parse(rawBody.toString());
        }),
    };
  }

  return {
    default: MockStripe,
  };
});

describe('Payments & Wallet (Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let sellerToken: string;
  let supplierToken: string;

  let sellerId: string;
  let supplierId: string;
  let orderId: string;
  const productSku = 'SKU-PAYMENTS-TEST';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(getQueueToken('order-events'))
      .useValue({ add: async () => {} })
      .overrideProvider(getQueueToken('notifications'))
      .useValue({ add: async () => {} })
      .overrideProvider(EventsProcessor)
      .useValue({})
      .overrideProvider(NotificationsProcessor)
      .useValue({})
      .overrideProvider(NotificationsService)
      .useValue({
        notifyPayment: async () => {},
        notifyOrderStatus: async () => {},
        notifyReturn: async () => {},
      })
      .compile();

    app = moduleFixture.createNestApplication();

    const cookieParserFn = (cookieParser as any).default || cookieParser;
    app.use(cookieParserFn());

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
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await cleanDatabase(prisma);
    await app.close();
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);

    // 1. Register Supplier A
    await request(app.getHttpServer()).post('/auth/register').send({
      email: 'supplier_pay@ukdh.co.uk',
      password: 'password123',
      role: 'SUPPLIER',
      companyName: 'Supplier Pay LTD',
      vat: 'GB999999999',
      address: 'Pay Road 1',
    });

    const userSupplier = await prisma.user.update({
      where: { email: 'supplier_pay@ukdh.co.uk' },
      data: { status: 'ACTIVE' },
      include: { supplier: true },
    });
    supplierId = userSupplier.supplier!.id;

    await prisma.supplier.update({
      where: { id: supplierId },
      data: { status: 'ACTIVE' },
    });

    // Create product
    const product = await prisma.product.create({
      data: {
        supplierId,
        sku: productSku,
        title: 'Payments Widget',
        category: 'Electronics',
        wholesalePrice: 40.0,
        status: 'ACTIVE',
        inventory: {
          create: {
            stock: 100,
            slaDays: 2,
          },
        },
      },
    });

    // 2. Register Seller
    await request(app.getHttpServer()).post('/auth/register').send({
      email: 'seller_pay@ukdh.co.uk',
      password: 'password123',
      role: 'SELLER',
      storePlatform: 'SHOPIFY',
      storeUrl: 'https://seller-pay.com',
    });

    const userSeller = await prisma.user.update({
      where: { email: 'seller_pay@ukdh.co.uk' },
      data: { status: 'ACTIVE' },
      include: { seller: true },
    });
    sellerId = userSeller.seller!.id;

    await prisma.seller.update({
      where: { id: sellerId },
      data: { status: 'ACTIVE' },
    });

    // 3. Create an Order in PENDING_SUPPLIER status
    const order = await prisma.order.create({
      data: {
        externalOrderId: 'ext_order_pay_1',
        sellerId,
        supplierId,
        status: 'PENDING_SUPPLIER',
        totalAmount: 80.0, // 2 items of £40.0
        items: {
          create: {
            productId: product.id,
            quantity: 2,
            unitPrice: 40.0,
          },
        },
      },
    });
    orderId = order.id;

    // Logins
    const loginSupplier = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'supplier_pay@ukdh.co.uk', password: 'password123' });
    supplierToken = loginSupplier.body.accessToken;

    const loginSeller = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'seller_pay@ukdh.co.uk', password: 'password123' });
    sellerToken = loginSeller.body.accessToken;
  });

  describe('POST /payments/checkout-session', () => {
    it('should allow seller to create a checkout session and register a PENDING transaction', async () => {
      const response = await request(app.getHttpServer())
        .post('/payments/checkout-session')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ orderId });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('clientSecret');
      expect(response.body).toHaveProperty('stripePaymentIntentId');

      // Verify transaction is recorded locally in PENDING status
      const tx = await prisma.transaction.findUnique({
        where: { stripePaymentIntentId: response.body.stripePaymentIntentId },
      });
      expect(tx).toBeDefined();
      expect(tx!.status).toBe(TransactionStatus.PENDING);
      expect(tx!.grossAmount).toBe(80.0);
      expect(tx!.platformFeeAmount).toBe(4.0); // 5% of 80 is 4.0
      expect(tx!.supplierNetAmount).toBe(76.0);
    });

    it('should reject requests from Suppliers', async () => {
      const response = await request(app.getHttpServer())
        .post('/payments/checkout-session')
        .set('Authorization', `Bearer ${supplierToken}`)
        .send({ orderId });

      expect(response.status).toBe(403);
    });
  });

  describe('Stripe Webhook Ingestion (/webhooks/stripe)', () => {
    it('should process payment_intent.succeeded, update order status, and adjust wallet balances', async () => {
      // 1. Create Checkout Session
      const sessionResponse = await request(app.getHttpServer())
        .post('/payments/checkout-session')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ orderId });

      const stripePaymentIntentId = sessionResponse.body.stripePaymentIntentId;

      // 2. Trigger Stripe Webhook Succeeded event (with signature bypass in dev mode)
      const webhookResponse = await request(app.getHttpServer())
        .post('/webhooks/stripe')
        .send({
          id: 'evt_test_123',
          type: 'payment_intent.succeeded',
          data: {
            object: {
              id: stripePaymentIntentId,
              latest_charge: 'ch_test_123',
            },
          },
        });

      expect(webhookResponse.status).toBe(200);

      // 3. Verify Transaction is now SUCCEEDED
      const tx = await prisma.transaction.findUnique({
        where: { stripePaymentIntentId },
      });
      expect(tx!.status).toBe(TransactionStatus.SUCCEEDED);
      expect(tx!.stripeChargeId).toBe('ch_test_123');

      // 4. Verify Order status transitioned to ACCEPTED
      const order = await prisma.order.findUnique({ where: { id: orderId } });
      expect(order!.status).toBe('ACCEPTED');

      // 5. Verify Supplier Wallet is credited with Net
      const supplierWallet = await prisma.wallet.findUnique({
        where: { supplierId },
      });
      expect(supplierWallet!.balance).toBe(76.0);

      // 6. Verify Seller Wallet logs spent balance (-80)
      const sellerWallet = await prisma.wallet.findUnique({
        where: { sellerId },
      });
      expect(sellerWallet!.balance).toBe(-80.0);
    });

    it('should be idempotent and not process duplicate events', async () => {
      // 1. Create Checkout Session
      const sessionResponse = await request(app.getHttpServer())
        .post('/payments/checkout-session')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ orderId });

      const stripePaymentIntentId = sessionResponse.body.stripePaymentIntentId;

      // 2. Trigger Webhook Succeeded twice
      await request(app.getHttpServer())
        .post('/webhooks/stripe')
        .send({
          id: 'evt_test_dup',
          type: 'payment_intent.succeeded',
          data: {
            object: { id: stripePaymentIntentId, latest_charge: 'ch_dup_1' },
          },
        });

      const secondWebhookRes = await request(app.getHttpServer())
        .post('/webhooks/stripe')
        .send({
          id: 'evt_test_dup',
          type: 'payment_intent.succeeded',
          data: {
            object: { id: stripePaymentIntentId, latest_charge: 'ch_dup_2' },
          },
        });

      expect(secondWebhookRes.status).toBe(200);

      // Wallet balance should only be credited once
      const supplierWallet = await prisma.wallet.findUnique({
        where: { supplierId },
      });
      expect(supplierWallet!.balance).toBe(76.0);
    });

    it('should reverse wallet credits and debits when handling charge.refunded', async () => {
      // 1. Create and succeed payment
      const sessionResponse = await request(app.getHttpServer())
        .post('/payments/checkout-session')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ orderId });

      const stripePaymentIntentId = sessionResponse.body.stripePaymentIntentId;

      await request(app.getHttpServer())
        .post('/webhooks/stripe')
        .send({
          type: 'payment_intent.succeeded',
          data: {
            object: { id: stripePaymentIntentId, latest_charge: 'ch_ref_1' },
          },
        });

      // 2. Trigger Refund Webhook
      const refundResponse = await request(app.getHttpServer())
        .post('/webhooks/stripe')
        .send({
          type: 'charge.refunded',
          data: {
            object: {
              payment_intent: stripePaymentIntentId,
            },
          },
        });

      expect(refundResponse.status).toBe(200);

      // 3. Verify status updates
      const tx = await prisma.transaction.findUnique({
        where: { stripePaymentIntentId },
      });
      expect(tx!.status).toBe(TransactionStatus.REFUNDED);

      const order = await prisma.order.findUnique({ where: { id: orderId } });
      expect(order!.status).toBe('CANCELLED');

      // 4. Verify reversed wallet balances
      const supplierWallet = await prisma.wallet.findUnique({
        where: { supplierId },
      });
      expect(supplierWallet!.balance).toBe(0.0); // 76.0 - 76.0

      const sellerWallet = await prisma.wallet.findUnique({
        where: { sellerId },
      });
      expect(sellerWallet!.balance).toBe(0.0); // -80.0 + 80.0
    });
  });

  describe('GET /wallet/me', () => {
    it('should return aggregated financial metrics and wallet for logged in user', async () => {
      // 1. Create and succeed payment
      const sessionResponse = await request(app.getHttpServer())
        .post('/payments/checkout-session')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ orderId });

      const stripePaymentIntentId = sessionResponse.body.stripePaymentIntentId;

      await request(app.getHttpServer())
        .post('/webhooks/stripe')
        .send({
          type: 'payment_intent.succeeded',
          data: {
            object: { id: stripePaymentIntentId, latest_charge: 'ch_wallet_1' },
          },
        });

      // 2. Query Supplier Wallet
      const supplierRes = await request(app.getHttpServer())
        .get('/wallet/me')
        .set('Authorization', `Bearer ${supplierToken}`);

      expect(supplierRes.status).toBe(200);
      expect(supplierRes.body.wallet.balance).toBe(76.0);
      expect(supplierRes.body.metrics.grossEarnings).toBe(80.0);
      expect(supplierRes.body.metrics.platformFeesPaid).toBe(4.0);
      expect(supplierRes.body.metrics.netAmount).toBe(76.0);
      expect(supplierRes.body.transactions.length).toBe(1);

      // 3. Query Seller Wallet
      const sellerRes = await request(app.getHttpServer())
        .get('/wallet/me')
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(sellerRes.status).toBe(200);
      expect(sellerRes.body.wallet.balance).toBe(-80.0);
      expect(sellerRes.body.metrics.grossEarnings).toBe(80.0);
      expect(sellerRes.body.metrics.platformFeesPaid).toBe(4.0);
      expect(sellerRes.body.metrics.netAmount).toBe(80.0);
    });
  });
});
