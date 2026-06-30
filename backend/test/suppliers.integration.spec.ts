import { describe, beforeAll, afterAll, beforeEach, it, expect } from 'vitest';
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, cleanDatabase } from './test-helper';

describe('Suppliers Integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let supplierToken: string;
  let sellerToken: string;

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

    // Register & Login a supplier
    await request(app.getHttpServer()).post('/auth/register').send({
      email: 'supplier@ukdh.co.uk',
      password: 'secure-password-123',
      role: 'SUPPLIER',
      companyName: 'Supplier LTD',
      vat: 'GB123456789',
      address: '1 Main St, London',
    });

    const supLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'supplier@ukdh.co.uk',
        password: 'secure-password-123',
      });
    supplierToken = supLogin.body.accessToken;

    // Register & Login a seller
    await request(app.getHttpServer()).post('/auth/register').send({
      email: 'seller@ukdh.co.uk',
      password: 'secure-password-123',
      role: 'SELLER',
      storePlatform: 'SHOPIFY',
      storeUrl: 'https://my-store.myshopify.com',
    });

    const selLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'seller@ukdh.co.uk',
        password: 'secure-password-123',
      });
    sellerToken = selLogin.body.accessToken;
  });

  describe('GET /suppliers/me', () => {
    it('should successfully return the profile for a supplier', async () => {
      const res = await request(app.getHttpServer())
        .get('/suppliers/me')
        .set('Authorization', `Bearer ${supplierToken}`);

      expect(res.status).toBe(200);
      expect(res.body.companyName).toBe('Supplier LTD');
      expect(res.body.vat).toBe('GB123456789');
    });

    it('should reject access to a seller role', async () => {
      const res = await request(app.getHttpServer())
        .get('/suppliers/me')
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /suppliers/me', () => {
    it('should update profile and activate status when fields are complete', async () => {
      // Initially, supplier should be pending
      const initialProfile = await request(app.getHttpServer())
        .get('/suppliers/me')
        .set('Authorization', `Bearer ${supplierToken}`);
      expect(initialProfile.body.status).toBe('PENDING');

      // Update fields
      const res = await request(app.getHttpServer())
        .patch('/suppliers/me')
        .set('Authorization', `Bearer ${supplierToken}`)
        .send({
          companyName: 'Supplier Updated LTD',
          vat: 'GB987654321',
          address: '20 High Street, London, EC1A 1AA',
          categories: ['Pets', 'Home'],
          shippingSla: 1,
        });

      expect(res.status).toBe(200);
      expect(res.body.companyName).toBe('Supplier Updated LTD');
      expect(res.body.status).toBe('ACTIVE');

      // Check User record status also activated
      const user = await prisma.user.findUnique({
        where: { email: 'supplier@ukdh.co.uk' },
      });
      expect(user?.status).toBe('ACTIVE');
    });

    it('should fail if missing required activation fields', async () => {
      const res = await request(app.getHttpServer())
        .patch('/suppliers/me')
        .set('Authorization', `Bearer ${supplierToken}`)
        .send({
          companyName: '', // empty companyName
          vat: 'GB123',
          address: 'London',
        });

      expect(res.status).toBe(400);
    });
  });
});
