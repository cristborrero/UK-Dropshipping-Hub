# Vertical 3 — Orders & Logistics

Implementar el procesamiento de pedidos B2B, actualizaciones de estado logístico, flujos de devolución e ingesta asíncrona mediante webhooks de Shopify y WooCommerce.

## Proposed Changes

### 1. Database Model (Prisma)
- Create `Order` model containing: `id`, `externalOrderId`, `sellerId`, `supplierId`, `status` (enum: `PENDING`, `ACCEPTED`, `SHIPPED`, `DELIVERED`, `CANCELLED`), `totalAmount`, `carrier`, `trackingCode`, and customer details.
- Create `OrderItem` model containing: `id`, `orderId`, `productId`, `quantity`, `unitPrice`.
- Create `ReturnRequest` model containing: `id`, `orderId`, `status` (enum: `PENDING`, `APPROVED`, `REJECTED`), `reason`.

### 2. Backend Modules (NestJS)
- **OrdersModule**: Transitions status flow controls (`PENDING` -> `ACCEPTED` -> `SHIPPED` -> `DELIVERED`).
- **IntegrationsModule**: Shopify and WooCommerce controllers parsing order webhooks and verifying signatures (HMAC).
- **BullMQ**: Queue jobs processing (`order-events`) to decouple webhooks processing from DB insertions.

### 3. Frontend Views (Remix)
- `/orders`: Role-filtered listings of orders.
- `/orders/:id`: Detail view of single order containing status trackers and returns request forms.

## Verification Plan

### Automated Tests
- `test/orders.integration.spec.ts`: Checks webhook ingestion, duplicate webhooks prevention (idempotency), carrier tracking requirements, transitions rules, and return request workflows.
