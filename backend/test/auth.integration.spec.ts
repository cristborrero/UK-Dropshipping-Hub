import { describe, beforeAll, afterAll, beforeEach, it, expect } from 'vitest';
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, cleanDatabase } from './test-helper';

describe('Auth Integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;

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
  });

  describe('POST /auth/register', () => {
    it('should successfully register a supplier', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'supplier@ukdh.co.uk',
          password: 'secure-password-123',
          role: 'SUPPLIER',
          companyName: 'UK Wholesale LTD',
          vat: 'GB123456789',
          address: '10 High Street, London',
        });

      expect(res.status).toBe(201);
      expect(res.body.email).toBe('supplier@ukdh.co.uk');
      expect(res.body.role).toBe('SUPPLIER');
      expect(res.body.status).toBe('PENDING');

      // Check DB
      const user = await prisma.user.findUnique({
        where: { email: 'supplier@ukdh.co.uk' },
        include: { supplier: true },
      });
      expect(user).toBeDefined();
      expect(user?.supplier?.companyName).toBe('UK Wholesale LTD');
    });

    it('should successfully register a seller', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'seller@ukdh.co.uk',
          password: 'secure-password-123',
          role: 'SELLER',
          storePlatform: 'SHOPIFY',
          storeUrl: 'https://my-store.myshopify.com',
        });

      expect(res.status).toBe(201);
      expect(res.body.email).toBe('seller@ukdh.co.uk');
      expect(res.body.role).toBe('SELLER');

      // Check DB
      const user = await prisma.user.findUnique({
        where: { email: 'seller@ukdh.co.uk' },
        include: { seller: true },
      });
      expect(user).toBeDefined();
      expect(user?.seller?.storePlatform).toBe('SHOPIFY');
    });

    it('should reject registration with duplicate email', async () => {
      // Create first user
      await request(app.getHttpServer()).post('/auth/register').send({
        email: 'duplicate@ukdh.co.uk',
        password: 'secure-password-123',
        role: 'SELLER',
        storePlatform: 'SHOPIFY',
        storeUrl: 'https://my-store.myshopify.com',
      });

      // Attempt second registration with same email
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'duplicate@ukdh.co.uk',
          password: 'other-password-999',
          role: 'SELLER',
          storePlatform: 'SHOPIFY',
          storeUrl: 'https://my-store.myshopify.com',
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('Email already registered');
    });

    it('should reject invalid role input', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'invalid@ukdh.co.uk',
          password: 'password123',
          role: 'INVALID_ROLE',
        });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      // Register user before each login test
      await request(app.getHttpServer()).post('/auth/register').send({
        email: 'login@ukdh.co.uk',
        password: 'secure-password-123',
        role: 'SELLER',
        storePlatform: 'SHOPIFY',
        storeUrl: 'https://my-store.myshopify.com',
      });
    });

    it('should return JWT tokens on valid login credentials', async () => {
      const res = await request(app.getHttpServer()).post('/auth/login').send({
        email: 'login@ukdh.co.uk',
        password: 'secure-password-123',
      });

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
    });

    it('should reject login with wrong password', async () => {
      const res = await request(app.getHttpServer()).post('/auth/login').send({
        email: 'login@ukdh.co.uk',
        password: 'wrong-password-here',
      });

      expect(res.status).toBe(401);
    });
  });
});
