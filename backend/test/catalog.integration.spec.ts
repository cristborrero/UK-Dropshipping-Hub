import { describe, beforeAll, afterAll, beforeEach, it, expect } from 'vitest';
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, cleanDatabase } from './test-helper';

describe('Catalog Integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let supplierToken: string;
  let otherSupplierToken: string;

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

    // Register, activate and login Supplier A
    await request(app.getHttpServer()).post('/auth/register').send({
      email: 'supplier-a@ukdh.co.uk',
      password: 'secure-password-123',
      role: 'SUPPLIER',
      companyName: 'Supplier A LTD',
      vat: 'GB123456789',
      address: '1 Main St, London',
    });

    const loginA = await request(app.getHttpServer()).post('/auth/login').send({
      email: 'supplier-a@ukdh.co.uk',
      password: 'secure-password-123',
    });
    supplierToken = loginA.body.accessToken;

    // Activate Supplier A
    await request(app.getHttpServer())
      .patch('/suppliers/me')
      .set('Authorization', `Bearer ${supplierToken}`)
      .send({
        companyName: 'Supplier A LTD',
        vat: 'GB123456789',
        address: '1 Main St, London',
        categories: ['Pets'],
        shippingSla: 2,
      });

    // Register, activate and login Supplier B (other supplier)
    await request(app.getHttpServer()).post('/auth/register').send({
      email: 'supplier-b@ukdh.co.uk',
      password: 'secure-password-123',
      role: 'SUPPLIER',
      companyName: 'Supplier B LTD',
      vat: 'GB987654321',
      address: '2 Main St, London',
    });

    const loginB = await request(app.getHttpServer()).post('/auth/login').send({
      email: 'supplier-b@ukdh.co.uk',
      password: 'secure-password-123',
    });
    otherSupplierToken = loginB.body.accessToken;

    await request(app.getHttpServer())
      .patch('/suppliers/me')
      .set('Authorization', `Bearer ${otherSupplierToken}`)
      .send({
        companyName: 'Supplier B LTD',
        vat: 'GB987654321',
        address: '2 Main St, London',
        categories: ['Home'],
        shippingSla: 3,
      });
  });

  describe('Product CRUD', () => {
    it('should allow supplier to create a product', async () => {
      const res = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${supplierToken}`)
        .send({
          sku: 'SKU-001',
          title: 'Product Title',
          description: 'Product Description',
          category: 'Pets',
          wholesalePrice: 15.5,
          stock: 100,
          slaDays: 2,
        });

      expect(res.status).toBe(201);
      expect(res.body.sku).toBe('SKU-001');
      expect(res.body.inventory.stock).toBe(100);
    });

    it('should reject creation with duplicate SKU for same supplier', async () => {
      // First creation
      await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${supplierToken}`)
        .send({
          sku: 'DUPLICATE-SKU',
          title: 'First Product',
          category: 'Pets',
          wholesalePrice: 10,
          stock: 50,
          slaDays: 2,
        });

      // Second creation attempt
      const res = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${supplierToken}`)
        .send({
          sku: 'DUPLICATE-SKU',
          title: 'Second Product',
          category: 'Pets',
          wholesalePrice: 20,
          stock: 10,
          slaDays: 1,
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('already exists');
    });

    it('should list only products owned by current supplier', async () => {
      // Create product for A
      await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${supplierToken}`)
        .send({
          sku: 'SKU-A',
          title: 'Product A',
          category: 'Pets',
          wholesalePrice: 10,
          stock: 50,
          slaDays: 2,
        });

      // Create product for B
      await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${otherSupplierToken}`)
        .send({
          sku: 'SKU-B',
          title: 'Product B',
          category: 'Home',
          wholesalePrice: 15,
          stock: 30,
          slaDays: 3,
        });

      // Request products list as Supplier A
      const res = await request(app.getHttpServer())
        .get('/products')
        .set('Authorization', `Bearer ${supplierToken}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].sku).toBe('SKU-A');
    });

    it('should enforce ownership when retrieving single product', async () => {
      // Create product for B
      const prodRes = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${otherSupplierToken}`)
        .send({
          sku: 'SKU-B',
          title: 'Product B',
          category: 'Home',
          wholesalePrice: 15,
          stock: 30,
          slaDays: 3,
        });

      const prodId = prodRes.body.id;

      // Attempt to fetch as Supplier A
      const res = await request(app.getHttpServer())
        .get(`/products/${prodId}`)
        .set('Authorization', `Bearer ${supplierToken}`);

      expect(res.status).toBe(403);
    });

    it('should successfully update product details and inventory', async () => {
      const prodRes = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${supplierToken}`)
        .send({
          sku: 'SKU-002',
          title: 'Original Title',
          category: 'Pets',
          wholesalePrice: 5.0,
          stock: 10,
          slaDays: 2,
        });

      const prodId = prodRes.body.id;

      const res = await request(app.getHttpServer())
        .patch(`/products/${prodId}`)
        .set('Authorization', `Bearer ${supplierToken}`)
        .send({
          title: 'New Title',
          wholesalePrice: 6.5,
          stock: 25,
          slaDays: 1,
        });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('New Title');
      expect(res.body.wholesalePrice).toBe(6.5);
      expect(res.body.inventory.stock).toBe(25);
      expect(res.body.inventory.slaDays).toBe(1);
    });

    it('should successfully soft-delete (deactivate) product', async () => {
      const prodRes = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${supplierToken}`)
        .send({
          sku: 'SKU-003',
          title: 'Deactivate Product',
          category: 'Pets',
          wholesalePrice: 5.0,
          stock: 10,
          slaDays: 2,
        });

      const prodId = prodRes.body.id;

      const delRes = await request(app.getHttpServer())
        .delete(`/products/${prodId}`)
        .set('Authorization', `Bearer ${supplierToken}`);

      expect(delRes.status).toBe(200);
      expect(delRes.body.status).toBe('INACTIVE');

      // Verify it is excluded from findMany active lists
      const listRes = await request(app.getHttpServer())
        .get('/products')
        .set('Authorization', `Bearer ${supplierToken}`);
      expect(listRes.body.find((p: any) => p.id === prodId)).toBeUndefined();
    });
  });

  describe('CSV Bulk Upload', () => {
    it('should process a valid CSV file upload', async () => {
      const csvContent =
        'sku,title,description,category,wholesale_price,stock,sla_days\n' +
        'CSV-001,CSV Product 1,First desc,Pets,12.50,45,2\n' +
        'CSV-002,CSV Product 2,Second desc,Pets,9.99,120,1';

      const res = await request(app.getHttpServer())
        .post('/products/upload-csv')
        .set('Authorization', `Bearer ${supplierToken}`)
        .attach('file', Buffer.from(csvContent), 'products.csv');

      expect(res.status).toBe(201);
      expect(res.body.createdCount).toBe(2);
      expect(res.body.errorCount).toBe(0);

      // Verify db insertions
      const products = await prisma.product.findMany({
        where: {
          supplierId: (
            await prisma.supplier.findUnique({
              where: { userId: 'supplier-a@ukdh.co.uk' },
            })
          )?.id,
        },
      });
      expect(products.length).toBe(2);
    });

    it('should process CSV reporting row failures for invalid entries', async () => {
      const csvContent =
        'sku,title,description,category,wholesale_price,stock,sla_days\n' +
        'CSV-003,CSV Product 3,Desc,Pets,invalid-price,50,2\n' + // invalid wholesalePrice
        'CSV-004,CSV Product 4,Desc,Pets,15.00,-10,2\n' + // invalid stock (< 0)
        'CSV-005,,Desc,Pets,10.00,30,2'; // missing title

      const res = await request(app.getHttpServer())
        .post('/products/upload-csv')
        .set('Authorization', `Bearer ${supplierToken}`)
        .attach('file', Buffer.from(csvContent), 'products.csv');

      expect(res.status).toBe(201);
      expect(res.body.createdCount).toBe(0);
      expect(res.body.errorCount).toBe(3);
      expect(res.body.errors[0]).toContain('Invalid wholesale price');
      expect(res.body.errors[1]).toContain('Invalid stock');
      expect(res.body.errors[2]).toContain('Missing Title');
    });
  });
});
