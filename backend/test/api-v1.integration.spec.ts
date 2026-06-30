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
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { PrismaService } from '../src/prisma/prisma.service';
import { AppModule } from '../src/app.module';
import { EventsProcessor } from '../src/events/events.processor';
import { NotificationsProcessor } from '../src/notifications/notifications.processor';
import { NotificationsService } from '../src/notifications/notifications.service';
import { cleanDatabase } from './test-helper';

describe('Public API v1 Integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const validApiKey = 'test_api_key_valid_999';
  const inactiveApiKey = 'test_api_key_inactive_888';

  let supplierId: string;
  let productId: string;
  let orderId: string;

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
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);

    // Create Api Clients
    await prisma.apiClient.createMany({
      data: [
        {
          name: 'Active Partner',
          apiKey: validApiKey,
          isActive: true,
        },
        {
          name: 'Inactive Partner',
          apiKey: inactiveApiKey,
          isActive: false,
        },
      ],
    });

    // Seed Supplier & User
    const supplierUser = await prisma.user.create({
      data: {
        email: 'api_supplier@ukdh.co.uk',
        passwordHash: 'hash',
        role: 'SUPPLIER',
        status: 'ACTIVE',
        supplier: {
          create: {
            companyName: 'API Supplier LTD',
            status: 'ACTIVE',
          },
        },
      },
      include: { supplier: true },
    });
    supplierId = supplierUser.supplier!.id;

    // Seed Product
    const product = await prisma.product.create({
      data: {
        supplierId,
        sku: 'API-PRODUCT-SKU',
        title: 'API Test Product',
        category: 'Electronics',
        wholesalePrice: 15.5,
        status: 'ACTIVE',
        inventory: {
          create: {
            stock: 10,
            slaDays: 2,
          },
        },
      },
    });
    productId = product.id;

    // Seed Seller & Order
    const sellerUser = await prisma.user.create({
      data: {
        email: 'api_seller@ukdh.co.uk',
        passwordHash: 'hash',
        role: 'SELLER',
        status: 'ACTIVE',
        seller: {
          create: {
            storePlatform: 'SHOPIFY',
            storeUrl: 'api-partner.myshopify.com',
            status: 'ACTIVE',
          },
        },
      },
      include: { seller: true },
    });
    const sellerId = sellerUser.seller!.id;

    const order = await prisma.order.create({
      data: {
        externalOrderId: 'ext_order_api_1',
        sellerId,
        supplierId,
        status: 'PENDING_SUPPLIER',
        totalAmount: 15.5,
        items: {
          create: {
            productId,
            quantity: 1,
            unitPrice: 15.5,
          },
        },
      },
    });
    orderId = order.id;

    // Seed Platform KPI Snapshot
    await prisma.platformKpiSnapshot.create({
      data: {
        windowStart: new Date(),
        windowEnd: new Date(),
        gmv: 12000.0,
        netSales: 11400.0,
        ordersTotal: 150,
        ordersByStatusPending: 10,
        ordersByStatusAccepted: 20,
        ordersByStatusShipped: 30,
        ordersByStatusDelivered: 80,
        ordersByStatusCancelled: 10,
        refundRate: 2.5,
        platformFeesTotal: 600.0,
        suppliersActiveCount: 5,
        sellersActiveCount: 10,
      },
    });
  });

  describe('Authentication Guards', () => {
    it('should deny access if API key is missing', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/products');
      expect(res.status).toBe(401);
      expect(res.body.message).toBe('API key is missing');
    });

    it('should deny access if API key is invalid', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/products')
        .set('x-api-key', 'wrong_api_key_123');
      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid or inactive API key');
    });

    it('should deny access if API key is inactive', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/products')
        .set('x-api-key', inactiveApiKey);
      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid or inactive API key');
    });

    it('should allow access via x-api-key header', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/products')
        .set('x-api-key', validApiKey);
      expect(res.status).toBe(200);
    });

    it('should allow access via Authorization header (ApiKey scheme)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/products')
        .set('Authorization', `ApiKey ${validApiKey}`);
      expect(res.status).toBe(200);
    });
  });

  describe('V1 Endpoint Functionality', () => {
    it('GET /api/v1/products should return filterable products list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/products?category=Electronics&inStockOnly=true')
        .set('x-api-key', validApiKey);

      expect(res.status).toBe(200);
      expect(res.body.items.length).toBe(1);
      expect(res.body.items[0].sku).toBe('API-PRODUCT-SKU');
      expect(res.body.meta.total).toBe(1);
    });

    it('GET /api/v1/products/:id should return single product details', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/products/${productId}`)
        .set('x-api-key', validApiKey);

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('API Test Product');
      expect(res.body.inventory.stock).toBe(10);
    });

    it('GET /api/v1/suppliers should return active suppliers', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/suppliers')
        .set('x-api-key', validApiKey);

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].companyName).toBe('API Supplier LTD');
    });

    it('GET /api/v1/suppliers/:id should return supplier details', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/suppliers/${supplierId}`)
        .set('x-api-key', validApiKey);

      expect(res.status).toBe(200);
      expect(res.body.companyName).toBe('API Supplier LTD');
      expect(res.body.reputationLevel).toBe('STANDARD');
    });

    it('GET /api/v1/orders should list recent orders without sensitive details', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/orders')
        .set('x-api-key', validApiKey);

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].externalOrderId).toBe('ext_order_api_1');
      expect(res.body[0].storeUrl).toBe('api-partner.myshopify.com');
      // Verify personal details like customerName/customerEmail/shippingAddress are NOT leaked
      expect(res.body[0].customerName).toBeUndefined();
      expect(res.body[0].shippingAddress).toBeUndefined();
    });

    it('GET /api/v1/orders/:id should return order items detail', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/orders/${orderId}`)
        .set('x-api-key', validApiKey);

      expect(res.status).toBe(200);
      expect(res.body.externalOrderId).toBe('ext_order_api_1');
      expect(res.body.items.length).toBe(1);
      expect(res.body.items[0].sku).toBe('API-PRODUCT-SKU');
      expect(res.body.items[0].price).toBe(15.5);
    });

    it('GET /api/v1/reputation/suppliers/:id should return reputation score', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/reputation/suppliers/${supplierId}`)
        .set('x-api-key', validApiKey);

      expect(res.status).toBe(200);
      expect(res.body.companyName).toBe('API Supplier LTD');
      expect(res.body.onTimeDeliveryRate).toBe(100.0);
    });

    it('GET /api/v1/analytics/platform/current should return platform KPIs', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/analytics/platform/current')
        .set('x-api-key', validApiKey);

      expect(res.status).toBe(200);
      expect(res.body.gmv).toBe(12000.0);
      expect(res.body.netSales).toBe(11400.0);
      expect(res.body.refundRate).toBe(2.5);
    });
  });
});
