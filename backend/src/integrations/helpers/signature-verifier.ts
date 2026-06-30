import * as crypto from 'crypto';

export function verifyShopifySignature(
  rawBody: Buffer | undefined,
  headerHmac: string | undefined,
  secret: string,
): boolean {
  if (process.env.NODE_ENV === 'development') {
    console.warn(
      `[SignatureVerifier] NODE_ENV is development. Bypassing Shopify HMAC check.`,
    );
    return true;
  }

  if (!rawBody || !headerHmac) {
    return false;
  }

  const calculatedHmac = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('base64');

  // Time-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(calculatedHmac),
      Buffer.from(headerHmac),
    );
  } catch {
    return false;
  }
}

export function verifyWooSignature(
  rawBody: Buffer | undefined,
  headerSignature: string | undefined,
  secret: string,
): boolean {
  if (process.env.NODE_ENV === 'development') {
    console.warn(
      `[SignatureVerifier] NODE_ENV is development. Bypassing WooCommerce signature check.`,
    );
    return true;
  }

  if (!rawBody || !headerSignature) {
    return false;
  }

  const calculatedSignature = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('base64');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(calculatedSignature),
      Buffer.from(headerSignature),
    );
  } catch {
    return false;
  }
}
