import { describe, beforeAll, afterAll, beforeEach, it, expect } from 'vitest';
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, cleanDatabase } from './test-helper';

describe('Notifications Integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let sellerToken: string;
  let sellerUserId: string;
  let supplierToken: string;
  let supplierUserId: string;

  beforeAll(async () => {
    const setup = await createTestApp();
    app = setup.app;
    prisma = setup.prisma;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);

    // Register & Login Seller
    const registerSellerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'seller@ukdh.co.uk',
        password: 'secure-password-123',
        role: 'SELLER',
        storePlatform: 'SHOPIFY',
        storeUrl: 'https://myshop.myshopify.com',
      });

    const loginSeller = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'seller@ukdh.co.uk',
        password: 'secure-password-123',
      });
    sellerToken = loginSeller.body.accessToken;

    const dbSellerUser = await prisma.user.findUnique({
      where: { email: 'seller@ukdh.co.uk' },
    });
    sellerUserId = dbSellerUser!.id;

    // Register & Login Supplier
    const registerSupplierRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'supplier@ukdh.co.uk',
        password: 'secure-password-123',
        role: 'SUPPLIER',
        companyName: 'Supplier Wholesalers',
        vat: 'GB123456789',
        address: '1 Wholesaler Rd, London',
      });

    const loginSupplier = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'supplier@ukdh.co.uk',
        password: 'secure-password-123',
      });
    supplierToken = loginSupplier.body.accessToken;

    const dbSupplierUser = await prisma.user.findUnique({
      where: { email: 'supplier@ukdh.co.uk' },
    });
    supplierUserId = dbSupplierUser!.id;
  });

  describe('In-App Notification Logs', () => {
    beforeEach(async () => {
      // Seed some notifications manually
      await prisma.notification.createMany({
        data: [
          {
            userId: sellerUserId,
            type: 'ORDER_STATUS',
            title: 'Order Shipped',
            body: 'Your order #123 has been shipped.',
            isRead: false,
          },
          {
            userId: sellerUserId,
            type: 'PAYMENT',
            title: 'Payment Confirmed',
            body: 'Your payment was successful.',
            isRead: true,
          },
        ],
      });
    });

    it('should list notifications for current user with unreadCount', async () => {
      const res = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.items.length).toBe(2);
      expect(res.body.unreadCount).toBe(1);
      expect(res.body.total).toBe(2);
    });

    it('should mark specific notification as read', async () => {
      const notifications = await prisma.notification.findMany({
        where: { userId: sellerUserId, isRead: false },
      });
      const unreadId = notifications[0].id;

      const res = await request(app.getHttpServer())
        .patch(`/notifications/${unreadId}/read`)
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const updated = await prisma.notification.findUnique({
        where: { id: unreadId },
      });
      expect(updated!.isRead).toBe(true);
    });

    it('should mark all notifications as read', async () => {
      const res = await request(app.getHttpServer())
        .patch('/notifications/read-all')
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const unreadCount = await prisma.notification.count({
        where: { userId: sellerUserId, isRead: false },
      });
      expect(unreadCount).toBe(0);
    });
  });

  describe('Notification Preferences', () => {
    it('should retrieve preferences (lazily created)', async () => {
      const res = await request(app.getHttpServer())
        .get('/notifications/preferences')
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.emailOrderStatus).toBe(true);
      expect(res.body.inAppOrderStatus).toBe(true);
    });

    it('should update preference options successfully', async () => {
      const res = await request(app.getHttpServer())
        .patch('/notifications/preferences')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          emailOrderStatus: false,
          inAppPaymentEvents: false,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.preferences.emailOrderStatus).toBe(false);
      expect(res.body.preferences.inAppPaymentEvents).toBe(false);

      const dbPrefs = await prisma.notificationPreference.findUnique({
        where: { userId: sellerUserId },
      });
      expect(dbPrefs!.emailOrderStatus).toBe(false);
      expect(dbPrefs!.inAppPaymentEvents).toBe(false);
    });
  });
});
