import { describe, beforeAll, afterAll, beforeEach, it, expect } from 'vitest';
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, cleanDatabase } from './test-helper';

describe('Catalogue Integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let sellerToken: string;
  let supplierToken: string;
  let supplierId: string;
  let productId: string;

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
    await request(app.getHttpServer()).post('/auth/register').send({
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

    // Register & Login Supplier
    await request(app.getHttpServer()).post('/auth/register').send({
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

    // Activate Supplier Profile
    await request(app.getHttpServer())
      .patch('/suppliers/me')
      .set('Authorization', `Bearer ${supplierToken}`)
      .send({
        companyName: 'Supplier Wholesalers',
        vat: 'GB123456789',
        address: '1 Wholesaler Rd, London',
        categories: ['Pets', 'Garden'],
        shippingSla: 2,
      });

    const supplier = await prisma.supplier.findFirst({
      where: { companyName: 'Supplier Wholesalers' },
    });
    supplierId = supplier!.id;

    // Create a product
    const productRes = await request(app.getHttpServer())
      .post('/products')
      .set('Authorization', `Bearer ${supplierToken}`)
      .send({
        sku: 'PET-DOG-BED',
        title: 'Luxury Dog Bed',
        description: 'Cozy dog bed',
        category: 'Pets',
        wholesalePrice: 20.0,
        stock: 50,
        slaDays: 2,
      });
    productId = productRes.body.id;
  });

  describe('Catalogue Listing', () => {
    it('should block non-SELLER roles from accessing catalogue', async () => {
      const res = await request(app.getHttpServer())
        .get('/catalogue')
        .set('Authorization', `Bearer ${supplierToken}`);
      expect(res.status).toBe(403);
    });

    it('should allow seller to retrieve the catalogue', async () => {
      const res = await request(app.getHttpServer())
        .get('/catalogue')
        .set('Authorization', `Bearer ${sellerToken}`);
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].title).toBe('Luxury Dog Bed');
      expect(res.body[0].supplier.companyName).toBe('Supplier Wholesalers');
    });

    it('should filter catalogue by category and stock', async () => {
      // Correct category
      const res1 = await request(app.getHttpServer())
        .get('/catalogue?category=Pets')
        .set('Authorization', `Bearer ${sellerToken}`);
      expect(res1.body.length).toBe(1);

      // Wrong category
      const res2 = await request(app.getHttpServer())
        .get('/catalogue?category=Garden')
        .set('Authorization', `Bearer ${sellerToken}`);
      expect(res2.body.length).toBe(0);
    });
  });

  describe('Catalogue Product Detail', () => {
    it('should retrieve detail including suggested retail price and estimated SLA window', async () => {
      const res = await request(app.getHttpServer())
        .get(`/catalogue/${productId}`)
        .set('Authorization', `Bearer ${sellerToken}`);
      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Luxury Dog Bed');
      expect(res.body.suggestedRetailPrice).toBe(36.0); // 20.00 * 1.8
      expect(res.body.estimatedShippingWindow).toBe('2 days');
    });
  });

  describe('Staged Import Action', () => {
    it('should create a staging import record successfully', async () => {
      const res = await request(app.getHttpServer())
        .post(`/catalogue/${productId}/import`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ platform: 'SHOPIFY' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.import.platform).toBe('SHOPIFY');
      expect(res.body.import.status).toBe('PENDING');

      // Verify db record
      const dbRecord = await prisma.sellerProductImport.findFirst({
        where: { productId },
      });
      expect(dbRecord).toBeDefined();
      expect(dbRecord!.platform).toBe('SHOPIFY');
    });

    it('should validate platform input parameters', async () => {
      const res = await request(app.getHttpServer())
        .post(`/catalogue/${productId}/import`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ platform: 'INVALID' });
      expect(res.status).toBe(400);
    });
  });
});
