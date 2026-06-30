# Vertical 4 — Reputation & KPI

Implementar el motor de puntuación de reputación de proveedores mediante cálculos automáticos diarios de On-Time Delivery (OTD), tasa de cancelación y niveles de fidelidad.

## Proposed Changes

### 1. Database Model (Prisma)
- Create `ProviderKpiSnapshot` model containing: `id`, `supplierId`, `windowStart`, `windowEnd`, `ordersTotal`, `otdPercentage`, `fillRatePercentage`, `cancelRatePercentage`, `returnRatePercentage`, `reputationScore`, `level` (enum: `STANDARD`, `VERIFIED`, `ELITE`), and timestamps.

### 2. Backend Modules (NestJS)
- **ReputationModule**: Cron jobs running daily.
  - Aggregates orders shipped/delivered within window.
  - Computes percentages (OTD = on-time delivery based on SLA days, cancel rate, etc.).
  - Saves the resulting scores in `ProviderKpiSnapshot`.
  - Assigns supplier tier level dynamically.

### 3. Frontend Views (Remix)
- `/reputation`: Scorecard metrics, trends, history charts, and indicators.

## Verification Plan

### Automated Tests
- `test/reputation.integration.spec.ts`: Checks reputation scoring math, cron triggering, and snapshots generation.
