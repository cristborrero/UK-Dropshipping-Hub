# Vertical 6 — Operator Analytics

Implementar el panel de monitoreo financiero y operativo de la plataforma (GMV, ventas netas, comisiones cobradas y recuento de agentes activos) mediante consolidaciones diarias automáticas.

## Proposed Changes

### 1. Database Model (Prisma)
- Create `PlatformKpiSnapshot` model containing: `id`, `windowStart`, `windowEnd`, `gmv`, `netSales`, `ordersTotal`, `ordersByStatusPending`, `ordersByStatusAccepted`, `ordersByStatusShipped`, `ordersByStatusDelivered`, `ordersByStatusCancelled`, `refundRate`, `platformFeesTotal`, `suppliersActiveCount`, `sellersActiveCount`, and timestamps.

### 2. Backend Modules (NestJS)
- **AnalyticsModule**: Cron scheduler executing daily.
  - Aggregates system transaction parameters (net sales, gross values, etc.).
  - Calculates status divisions and active accounts counts.
  - Resolves snapshot parameters and saves to `PlatformKpiSnapshot`.

### 3. Frontend Views (Remix)
- `/analytics`: Operator dashboard for administrators showing platform statistics, performing entities lists, and manual cron triggers.

## Verification Plan

### Automated Tests
- `test/analytics.integration.spec.ts`: Checks roles guard protection (Admin-only), financial calculation logic, and cron job snapshot writing.
