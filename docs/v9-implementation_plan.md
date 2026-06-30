# Vertical 9 — Public API

This implementation plan covers the development of the **Public API** vertical (V9). The goal is to expose a stable, versioned REST API that allows external clients (agencies, SaaS tools, advanced sellers) to integrate with the UK Dropshipping Hub in a controlled, secure way.

---

## Objectives

- Design and publish a `v1` REST API surface for core resources.
- Implement API key–based authentication for external clients.
- Provide basic rate limiting and observability.
- Generate OpenAPI/Swagger documentation and a minimal developer guide.

---

## 1. API Surface — v1

We will scope `v1` to read-heavy operations with minimal write capabilities.

### 1.1 Resources

- Products
  - `GET /api/v1/products` — list products (filterable, paginated).
  - `GET /api/v1/products/:id` — get product detail.

- Suppliers
  - `GET /api/v1/suppliers` — list suppliers with basic metadata.
  - `GET /api/v1/suppliers/:id` — get supplier detail + latest reputation KPIs.

- Orders (read-only in v1)
  - `GET /api/v1/orders` — list orders (restricted to client’s context, see below).
  - `GET /api/v1/orders/:id` — order detail.

- Reputation
  - `GET /api/v1/reputation/suppliers/:id` — supplier reputation snapshot.

- Analytics (high-level, read-only)
  - `GET /api/v1/analytics/platform/current` — limited operator metrics (non-sensitive).

Notes:
- v1 is intentionally conservative on writes; future v2 can add create/update operations once we have clear multi-tenant boundaries.

---

## 2. Authentication & Authorization

### 2.1 API Keys

We will introduce an `ApiClient` model and API key mechanism.

#### [MODIFY] `schema.prisma`

```prisma
model ApiClient {
  id          String   @id @default(uuid())
  name        String   @map("name")
  apiKey      String   @unique @map("api_key")
  isActive    Boolean  @default(true) @map("is_active")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  // Optional: tenant scoping later

  @@map("api_clients")
}
```

### 2.2 API Key Auth Guard

#### [NEW] `backend/src/api/api-key.guard.ts`

- Extracts API key from:
  - `Authorization: ApiKey <key>` header, or
  - `x-api-key` header.
- Validates against `ApiClient` table.
- Attaches `apiClient` to request context.

#### [NEW] `backend/src/api/api-key.strategy.ts`

- Optional strategy wrapper for NestJS if you want to integrate with `@nestjs/passport`.

---

## 3. API Module & Controllers

### 3.1 Module

#### [NEW] `backend/src/api/api.module.ts`

- Imports: `ProductsModule`, `SuppliersModule`, `OrdersModule`, `ReputationModule`, `AnalyticsModule`.
- Provides: `ApiController` classes for v1.

### 3.2 Controllers

#### [NEW] `backend/src/api/v1/products.controller.ts`

- `GET /api/v1/products`
  - Query params: `page`, `pageSize`, `category`, `minPrice`, `maxPrice`, `supplierId`, `inStockOnly`.
  - Response: paginated list of products.

- `GET /api/v1/products/:id`

#### [NEW] `backend/src/api/v1/suppliers.controller.ts`

- `GET /api/v1/suppliers`
  - Return limited fields: name, location, reputation level.

- `GET /api/v1/suppliers/:id`
  - Return supplier + latest `ProviderKpiSnapshot`.

#### [NEW] `backend/src/api/v1/orders.controller.ts`

- `GET /api/v1/orders`
  - In v1, restricted:
    - Either to orders where the client is associated (future tenant model), or
    - To demo/sandbox environment only.

- `GET /api/v1/orders/:id`

#### [NEW] `backend/src/api/v1/reputation.controller.ts`

- `GET /api/v1/reputation/suppliers/:id`

#### [NEW] `backend/src/api/v1/analytics.controller.ts`

- `GET /api/v1/analytics/platform/current`
  - Return subset: GMV, Net Sales, Refund Rate, active suppliers/sellers (no sensitive user data).

All v1 controllers:
- Decorated with `@UseGuards(ApiKeyGuard)`.
- Versioned under `/api/v1/...` path.

#### [MODIFY] `backend/src/app.module.ts`

- Register `ApiModule`.

---

## 4. Rate Limiting & Observability

### 4.1 Rate Limiting

Depending on your existing stack, choose one:

- Use NestJS `@nestjs/throttler`:
  - Global or per-controller limit, e.g. 100 requests/min per API key.

Or

- Use API gateway (NGINX/Traefik) upstream where applicable.

#### [NEW] `backend/src/api/api.throttler.ts`

- Configuration for `ThrottlerModule` if using NestJS.

### 4.2 Logging & Metrics

#### [MODIFY] Logging layer

- Add structured logs for all `/api/v1/*` requests:
  - apiKey, path, status code, latency.

Optional:
- Expose Prometheus metrics for API usage.

---

## 5. Documentation (OpenAPI & Dev Guide)

### 5.1 OpenAPI / Swagger

#### [MODIFY] `main.ts` or dedicated bootstrap

- Enable Swagger for `/api-docs` in dev/staging:
  - Include `v1` controllers.

#### [NEW] `backend/src/api/openapi.ts`

- Configures tags and descriptions:
  - Products, Suppliers, Orders, Reputation, Analytics.

### 5.2 Developer Guide

#### [NEW] `API_REFERENCE.md`

- Contents:
  - Authentication: how to obtain & use API keys.
  - Example requests (curl) for each endpoint.
  - Rate limits.
  - Error formats.

#### [NEW] `API_GETTING_STARTED.md`

- Short onboarding for external integrators:
  - How to request an API key (manual for now).
  - How to test in sandbox.

---

## 6. Testing

### 6.1 Backend

#### [NEW] `backend/test/api-v1.integration.spec.ts`

Covers:

- Authentication via API key.
- Products listing and filters.
- Supplier detail + KPIs.
- Reputation endpoint.
- Analytics snapshot endpoint.

#### [NEW] `backend/test/api-key.guard.spec.ts`

Covers:

- Valid API key → request allowed.
- Invalid/absent API key → 401.

---

## 7. Rollout & Verification

### 7.1 Local Verification

1. Create `ApiClient` records manually in DB.
2. Use curl/Postman to call `/api/v1/*` with:
   - Valid API key.
   - Invalid API key.
3. Check:
   - Correct data returned.
   - Rate limiting behaves as expected.
   - Logs capture API usage.

### 7.2 Staging / Demo

- Prepare one or two test API keys.
- Share `API_REFERENCE.md` and a set of ready-made Postman collections.
- Use them to demo:
  - Product discovery.
  - Supplier KPI checks.
  - High-level analytics access.

---

## 8. Tasks Summary

| Phase | Area                     | Tasks |
|-------|--------------------------|-------|
| 1     | Data & Prisma            | Add `ApiClient` model |
| 2     | Auth & Guard             | Implement `ApiKeyGuard` and strategy |
| 3     | API Module & Controllers | Implement v1 controllers for core resources |
| 4     | Rate Limiting & Logging  | Configure throttling and request logging |
| 5     | Documentation            | Swagger/OpenAPI and MD guides |
| 6     | Testing                  | Integration + guard tests |
| 7     | Rollout & Verification   | Local + staging walkthrough |
