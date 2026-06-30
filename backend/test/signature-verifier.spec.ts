import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as crypto from 'crypto';
import {
  verifyShopifySignature,
  verifyWooSignature,
} from '../src/integrations/helpers/signature-verifier';

describe('Signature Verifiers (Unit)', () => {
  const secret = 'test-secret-key';
  const payload = JSON.stringify({ event: 'order_created', id: 123 });
  const rawBody = Buffer.from(payload);

  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  describe('verifyShopifySignature', () => {
    it('should verify correct signature in production mode', () => {
      process.env.NODE_ENV = 'production';
      const hmac = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('base64');

      const result = verifyShopifySignature(rawBody, hmac, secret);
      expect(result).toBe(true);
    });

    it('should reject incorrect signature in production mode', () => {
      process.env.NODE_ENV = 'production';
      const result = verifyShopifySignature(rawBody, 'wrong-hmac', secret);
      expect(result).toBe(false);
    });

    it('should bypass and return true in development mode regardless of signature', () => {
      process.env.NODE_ENV = 'development';
      const result = verifyShopifySignature(
        rawBody,
        'invalid-signature',
        secret,
      );
      expect(result).toBe(true);
    });
  });

  describe('verifyWooSignature', () => {
    it('should verify correct signature in production mode', () => {
      process.env.NODE_ENV = 'production';
      const signature = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('base64');

      const result = verifyWooSignature(rawBody, signature, secret);
      expect(result).toBe(true);
    });

    it('should reject incorrect signature in production mode', () => {
      process.env.NODE_ENV = 'production';
      const result = verifyWooSignature(rawBody, 'wrong-signature', secret);
      expect(result).toBe(false);
    });

    it('should bypass and return true in development mode', () => {
      process.env.NODE_ENV = 'development';
      const result = verifyWooSignature(rawBody, 'invalid-signature', secret);
      expect(result).toBe(true);
    });
  });
});
