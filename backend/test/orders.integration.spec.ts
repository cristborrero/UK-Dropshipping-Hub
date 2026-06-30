import { describe, beforeAll, afterAll, beforeEach, it, expect } from 'vitest';
import request from 'supertest';
import * as crypto from 'crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { OrderStatus, ReturnStatus } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import * as cookieParser from 'cookie-parser';
import { json } from 'body-parser';
import { cleanDatabase } from './test-helper';
import { PrismaService } from '../src/prisma/prisma.service';
import { AppModule } from '../src/app.module';
import { OrdersService } from '../src/orders/orders.service';
import { EventsProcessor } from '../src/events/events.processor';
import { NotificationsProcessor } from '../src/notifications/notifications.processor';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

describe('Orders & Logistics (Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let supplierToken: string;
  let sellerToken: string;
  let otherSupplierToken: string;

  let supplierId: string;
  let sellerId: string;
  let productId: string;
  const productSku = 'SKU-TEST-ORDER';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(getQueueToken('order-events'))
      .useValue({
        add: async (name: string, data: any) => {
          const ordersService = moduleFixture.get(OrdersService);
          if (
            name === 'process-shopify-webhook' ||
            name === 'process-woo-webhook'
          ) {
            try {
              await ordersService.createFromWebhook({
                externalOrderId: data.externalOrderId,
                storeUrl: data.shopDomain,
                items: data.items,
                totalAmount: data.totalAmount,
              });
            } catch (err) {
              console.error('[MockQueue] Webhook processing error:', err);
            }
          }
        },
      })
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
      email: 'supplierA@ukdh.co.uk',
      password: 'password123',
      role: 'SUPPLIER',
      companyName: 'Supplier A LTD',
      vat: 'GB111111111',
      address: '1 Supplier Road',
    });

    // Make Supplier A active
    const userA = await prisma.user.update({
      where: { email: 'supplierA@ukdh.co.uk' },
      data: { status: 'ACTIVE' },
      include: { supplier: true },
    });
    await prisma.supplier.update({
      where: { id: userA.supplier!.id },
      data: { status: 'ACTIVE' },
    });
    supplierId = userA.supplier!.id;

    // Create Product for Supplier A
    const product = await prisma.product.create({
      data: {
        supplierId,
        sku: productSku,
        title: 'Wholesale Widget',
        category: 'Toys',
        wholesalePrice: 10.0,
        status: 'ACTIVE',
        inventory: {
          create: {
            stock: 20,
            slaDays: 1,
          },
        },
      },
    });
    productId = product.id;

    // 2. Register Seller
    await request(app.getHttpServer()).post('/auth/register').send({
      email: 'seller@ukdh.co.uk',
      password: 'password123',
      role: 'SELLER',
      storePlatform: 'SHOPIFY',
      storeUrl: 'https://seller-store.com',
    });

    // Make Seller active
    const userSeller = await prisma.user.update({
      where: { email: 'seller@ukdh.co.uk' },
      data: { status: 'ACTIVE' },
      include: { seller: true },
    });
    await prisma.seller.update({
      where: { id: userSeller.seller!.id },
      data: { status: 'ACTIVE' },
    });
    sellerId = userSeller.seller!.id;

    // 3. Register Supplier B
    await request(app.getHttpServer()).post('/auth/register').send({
      email: 'supplierB@ukdh.co.uk',
      password: 'password123',
      role: 'SUPPLIER',
      companyName: 'Supplier B LTD',
      vat: 'GB222222222',
      address: '2 Supplier Road',
    });

    // Make Supplier B active
    const userB = await prisma.user.update({
      where: { email: 'supplierB@ukdh.co.uk' },
      data: { status: 'ACTIVE' },
      include: { supplier: true },
    });
    await prisma.supplier.update({
      where: { id: userB.supplier!.id },
      data: { status: 'ACTIVE' },
    });

    // Logins to fetch tokens
    const loginA = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'supplierA@ukdh.co.uk', password: 'password123' });
    supplierToken = loginA.body.accessToken;

    const loginSeller = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'seller@ukdh.co.uk', password: 'password123' });
    sellerToken = loginSeller.body.accessToken;

    const loginB = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'supplierB@ukdh.co.uk', password: 'password123' });
    otherSupplierToken = loginB.body.accessToken;
  });

  describe('Shopify Webhook Ingestion', () => {
    it('should successfully ingest shopify order webhook and return 202', async () => {
      const webhookPayload = {
        id: 123456,
        total_price: '20.00',
        line_items: [
          {
            sku: productSku,
            quantity: 2,
            price: '10.00',
          },
        ],
      };

      const rawBody = JSON.stringify(webhookPayload);
      const secret = process.env.SHOPIFY_WEBHOOK_SECRET || 'shopify-secret-key';
      const hmac = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('base64');

      const res = await request(app.getHttpServer())
        .post('/webhooks/shopify/orders/create')
        .set('x-shopify-shop-domain', 'seller-store.com')
        .set('x-shopify-hmac-sha256', hmac)
        .set('Content-Type', 'application/json')
        .send(rawBody);

      expect(res.status).toBe(202);
      expect(res.body.accepted).toBe(true);

      // Wait briefly for BullMQ to process job
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Verify Order creation
      const order = await prisma.order.findFirst({
        where: { externalOrderId: '123456' },
        include: { items: true },
      });

      expect(order).toBeDefined();
      expect(order?.status).toBe(OrderStatus.PENDING_SUPPLIER);
      expect(order?.totalAmount).toBe(20.0);
      expect(order?.items.length).toBe(1);
      expect(order?.items[0].productId).toBe(productId);
      expect(order?.items[0].quantity).toBe(2);

      // Verify inventory was decremented: 20 - 2 = 18
      const inv = await prisma.inventory.findUnique({
        where: { productId },
      });
      expect(inv?.stock).toBe(18);
    });

    it('should reject webhook if Shopify signature is incorrect', async () => {
      const webhookPayload = { id: 111 };
      const res = await request(app.getHttpServer())
        .post('/webhooks/shopify/orders/create')
        .set('x-shopify-shop-domain', 'seller-store.com')
        .set('x-shopify-hmac-sha256', 'badsignature')
        .send(webhookPayload);

      // In test, signature check is fully validated
      expect(res.status).toBe(401);
    });

    it('should be idempotent and not create duplicate orders for same externalOrderId + sellerId', async () => {
      const webhookPayload = {
        id: 7777,
        total_price: '10.00',
        line_items: [{ sku: productSku, quantity: 1, price: '10.00' }],
      };

      const rawBody = JSON.stringify(webhookPayload);
      const secret = process.env.SHOPIFY_WEBHOOK_SECRET || 'shopify-secret-key';
      const hmac = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('base64');

      // Send 1st
      await request(app.getHttpServer())
        .post('/webhooks/shopify/orders/create')
        .set('x-shopify-shop-domain', 'seller-store.com')
        .set('x-shopify-hmac-sha256', hmac)
        .set('Content-Type', 'application/json')
        .send(rawBody);

      // Send 2nd
      await request(app.getHttpServer())
        .post('/webhooks/shopify/orders/create')
        .set('x-shopify-shop-domain', 'seller-store.com')
        .set('x-shopify-hmac-sha256', hmac)
        .set('Content-Type', 'application/json')
        .send(rawBody);

      await new Promise((resolve) => setTimeout(resolve, 150));

      const count = await prisma.order.count({
        where: { externalOrderId: '7777', sellerId },
      });
      expect(count).toBe(1);
    });
  });

  describe('Order State Transitions & Authorization', () => {
    let orderId: string;

    beforeEach(async () => {
      // Manually create an order in DB to test lifecycle operations
      const order = await prisma.order.create({
        data: {
          externalOrderId: '98765',
          sellerId,
          supplierId,
          totalAmount: 10.0,
          status: OrderStatus.PENDING_SUPPLIER,
          items: {
            create: {
              productId,
              quantity: 1,
              unitPrice: 10.0,
            },
          },
        },
      });
      orderId = order.id;
    });

    it('should allow Supplier A to accept a pending order', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${supplierToken}`)
        .send({ status: 'ACCEPTED' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(OrderStatus.ACCEPTED);
    });

    it('should reject transitions from ACCEPTED to SHIPPED if tracking info is missing', async () => {
      // Transition to ACCEPTED first
      await prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.ACCEPTED },
      });

      const res = await request(app.getHttpServer())
        .patch(`/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${supplierToken}`)
        .send({ status: 'SHIPPED' });

      expect(res.status).toBe(400); // Bad Request (Missing carrier/tracking)
    });

    it('should allow transitions from ACCEPTED to SHIPPED when tracking info is supplied', async () => {
      await prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.ACCEPTED },
      });

      const res = await request(app.getHttpServer())
        .patch(`/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${supplierToken}`)
        .send({
          status: 'SHIPPED',
          carrier: 'Royal Mail',
          trackingCode: 'RM123456789GB',
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(OrderStatus.SHIPPED);
      expect(res.body.carrier).toBe('Royal Mail');
      expect(res.body.trackingCode).toBe('RM123456789GB');
    });

    it('should prevent Supplier B (unauthorized) from modifying Supplier A order', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${otherSupplierToken}`)
        .send({ status: 'ACCEPTED' });

      expect(res.status).toBe(403); // Forbidden
    });

    it('should block illegal transitions (e.g. ACCEPTED -> DELIVERED directly)', async () => {
      await prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.ACCEPTED },
      });

      const res = await request(app.getHttpServer())
        .patch(`/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${supplierToken}`)
        .send({ status: 'DELIVERED' });

      expect(res.status).toBe(400); // Invalid transition
    });
  });

  describe('Returns & Refund Requests Workflow', () => {
    let orderId: string;

    beforeEach(async () => {
      const order = await prisma.order.create({
        data: {
          externalOrderId: '55443',
          sellerId,
          supplierId,
          totalAmount: 25.0,
          status: OrderStatus.DELIVERED,
          items: {
            create: {
              productId,
              quantity: 2,
              unitPrice: 12.5,
            },
          },
        },
      });
      orderId = order.id;
    });

    it('should allow seller to request return for DELIVERED order', async () => {
      const res = await request(app.getHttpServer())
        .post(`/orders/${orderId}/returns`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ reason: 'Damaged item upon delivery' });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe(ReturnStatus.PENDING);
      expect(res.body.reason).toBe('Damaged item upon delivery');

      // Verify order status updated to RETURN_REQUESTED
      const updatedOrder = await prisma.order.findUnique({
        where: { id: orderId },
      });
      expect(updatedOrder?.status).toBe(OrderStatus.RETURN_REQUESTED);
    });

    it('should allow supplier to approve return requests', async () => {
      // Setup order and return request
      await prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.RETURN_REQUESTED },
      });
      await prisma.returnRequest.create({
        data: {
          orderId,
          reason: 'Broken product',
          status: ReturnStatus.PENDING,
        },
      });

      const res = await request(app.getHttpServer())
        .patch(`/orders/${orderId}/returns`)
        .set('Authorization', `Bearer ${supplierToken}`)
        .send({ decision: 'APPROVE' });

      expect(res.status).toBe(200);

      const updatedOrder = await prisma.order.findUnique({
        where: { id: orderId },
        include: { returns: true },
      });
      expect(updatedOrder?.status).toBe(OrderStatus.RETURN_APPROVED);
      expect(updatedOrder?.returns?.status).toBe(ReturnStatus.APPROVED);
    });

    it('should allow supplier to reject return requests', async () => {
      await prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.RETURN_REQUESTED },
      });
      await prisma.returnRequest.create({
        data: {
          orderId,
          reason: 'Broken product',
          status: ReturnStatus.PENDING,
        },
      });

      const res = await request(app.getHttpServer())
        .patch(`/orders/${orderId}/returns`)
        .set('Authorization', `Bearer ${supplierToken}`)
        .send({ decision: 'REJECT' });

      expect(res.status).toBe(200);

      const updatedOrder = await prisma.order.findUnique({
        where: { id: orderId },
        include: { returns: true },
      });
      expect(updatedOrder?.status).toBe(OrderStatus.RETURN_REJECTED);
      expect(updatedOrder?.returns?.status).toBe(ReturnStatus.REJECTED);
    });
  });
});
