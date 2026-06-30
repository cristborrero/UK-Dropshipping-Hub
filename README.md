<div align="center">

<img src="frontend/public/img-bg-hero.svg" alt="UK Dropshipping Hub" width="80" />

# UK Dropshipping Hub

**B2B dropshipping infrastructure for the UK market.**  
Connect verified UK wholesalers with Shopify and WooCommerce sellers — automated fulfilment, real-time stock sync, and transparent Stripe payouts.

[![NestJS](https://img.shields.io/badge/NestJS-v10-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com)
[![Remix](https://img.shields.io/badge/Remix-v7-000000?logo=remix&logoColor=white)](https://remix.run)
[![Prisma](https://img.shields.io/badge/Prisma-v7-2D3748?logo=prisma&logoColor=white)](https://prisma.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://postgresql.org)
[![Stripe](https://img.shields.io/badge/Stripe-Connect-008CDD?logo=stripe&logoColor=white)](https://stripe.com)
[![License](https://img.shields.io/badge/License-Private-gray)](#)

</div>

---

## Overview

UK Dropshipping Hub is a **B2B SaaS platform** that eliminates the friction between UK product suppliers and e-commerce sellers. The platform handles:

- **Supplier onboarding & verification** — VAT validation, KYC-ready profile setup
- **Product catalogue management** — manual and CSV bulk import
- **Order lifecycle** — from Shopify/WooCommerce webhook to supplier fulfilment
- **Payments** — Stripe Connect Destination Charges with automatic fee splitting
- **Reputation scoring** — daily KPI snapshots (OTD, Fill Rate, Cancel Rate)
- **Operator analytics** — platform-wide GMV, net sales, and growth metrics

---

## Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                        Client Layer                           │
│   Remix v7 + React Router v7 + TailwindCSS v4               │
│   Server-Side Rendering · Session cookies · Role-based UI    │
└──────────────────────────┬────────────────────────────────────┘
                           │ HTTP (REST)
┌──────────────────────────▼────────────────────────────────────┐
│                       API Layer                               │
│   NestJS v10 · JWT Auth · Guards · Interceptors              │
│   BullMQ queues · Stripe webhooks · @nestjs/schedule crons   │
└──────────────────────────┬────────────────────────────────────┘
                           │
         ┌─────────────────┼──────────────────┐
         ▼                 ▼                  ▼
  ┌──────────┐     ┌──────────────┐    ┌──────────┐
  │PostgreSQL│     │    Redis 7   │    │  Stripe  │
  │  Prisma 7│     │   (BullMQ)   │    │ Connect  │
  └──────────┘     └──────────────┘    └──────────┘
```

### Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend framework | Remix / React Router | v7 |
| Styling | TailwindCSS | v4 |
| Backend framework | NestJS | v10 |
| ORM | Prisma | v7 |
| Database | PostgreSQL | 16 |
| Cache / Queue | Redis + BullMQ | 7 |
| Authentication | JWT (access + refresh) | — |
| Payments | Stripe Connect | Latest |
| Job scheduling | @nestjs/schedule | — |

---

## Prerequisites

- **Node.js** ≥ 22 (22.22+ recommended)
- **Docker** (for PostgreSQL + Redis via docker-compose)
- **Stripe CLI** (for local webhook forwarding)

---

## Quick Start

### 1. Clone & configure environment

```bash
git clone <repo-url>
cd 18-UK-Dropshipping-Hub

# Copy and fill in environment variables
cp .env.example backend/.env
```

**Required backend environment variables** (`backend/.env`):

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/dropshipping_hub
JWT_SECRET=change_me_jwt_secret
JWT_REFRESH_SECRET=change_me_refresh_secret
REDIS_URL=redis://localhost:6379
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
SHOPIFY_WEBHOOK_SECRET=your_shopify_hmac_secret
WOO_WEBHOOK_SECRET=your_woo_secret
PORT=3000
```

**Required frontend environment variables** (`frontend/.env`):

```env
API_BASE_URL=http://localhost:3000
SESSION_SECRET=change_me_session_secret
```

### 2. Start infrastructure

```bash
# Start PostgreSQL and Redis
docker-compose up -d
```

### 3. Install dependencies & migrate

```bash
# Backend
cd backend
npm install
npx prisma migrate dev

# Frontend
cd ../frontend
npm install
```

### 4. Run in development

```bash
# Terminal 1 — Backend API
cd backend
npm run start:dev
# → http://localhost:3000

# Terminal 2 — Frontend
cd frontend
npm run dev
# → http://localhost:5173

# Terminal 3 — Stripe webhook forwarding (optional, for payments)
stripe listen --forward-to localhost:3000/webhooks/stripe
```

---

## API Reference

All endpoints are prefixed with `http://localhost:3000`.

### Authentication

| Method | Path | Auth | Description |
|--------|------|:----:|-------------|
| `POST` | `/auth/register` | ❌ | Register as Supplier or Seller |
| `POST` | `/auth/login` | ❌ | Get access + refresh tokens |
| `POST` | `/auth/refresh` | ❌ | Refresh access token |
| `GET` | `/auth/me` | ✅ | Current user profile |

**Register payload (Supplier):**
```json
{
  "email": "contact@supplier.co.uk",
  "password": "securepass",
  "role": "SUPPLIER",
  "companyName": "UK Wholesale Ltd",
  "vat": "GB123456789",
  "address": "10 Down St, London, W1J 7DY"
}
```

**Register payload (Seller):**
```json
{
  "email": "owner@mystore.com",
  "password": "securepass",
  "role": "SELLER",
  "storePlatform": "SHOPIFY",
  "storeUrl": "https://my-store.myshopify.com"
}
```

### Product Catalogue

| Method | Path | Auth | Description |
|--------|------|:----:|-------------|
| `GET` | `/products` | ✅ | List all products |
| `POST` | `/products` | ✅ Supplier | Create product |
| `GET` | `/products/:id` | ✅ | Get product by ID |
| `PATCH` | `/products/:id` | ✅ Owner | Update product |
| `DELETE` | `/products/:id` | ✅ Owner | Delete product |
| `POST` | `/products/upload-csv` | ✅ Supplier | Bulk import via CSV |

### Orders & Logistics

| Method | Path | Auth | Description |
|--------|------|:----:|-------------|
| `GET` | `/orders/seller` | ✅ Seller | Seller's orders |
| `GET` | `/orders/supplier` | ✅ Supplier | Supplier's orders |
| `GET` | `/orders/:id` | ✅ | Order detail |
| `PATCH` | `/orders/:id/status` | ✅ Supplier | Update order status |
| `POST` | `/orders/:id/returns` | ✅ Seller | Request return |
| `PATCH` | `/orders/:id/returns` | ✅ Supplier | Process return |
| `POST` | `/webhooks/shopify/orders/create` | 🔒 HMAC | Shopify order webhook |
| `POST` | `/webhooks/woo/orders/create` | 🔒 Signature | WooCommerce webhook |

**Order status flow:**
```
PENDING_SUPPLIER → ACCEPTED → SHIPPED → DELIVERED
                 → CANCELLED
DELIVERED → RETURN_REQUESTED → RETURN_APPROVED / RETURN_REJECTED
```

### Payments & Wallet

| Method | Path | Auth | Description |
|--------|------|:----:|-------------|
| `POST` | `/payments/checkout-session` | ✅ | Create Stripe checkout |
| `POST` | `/webhooks/stripe` | 🔒 Stripe-Signature | Payment webhooks |
| `GET` | `/wallet/me` | ✅ | Balance, transactions, metrics |

### Reputation

| Method | Path | Auth | Description |
|--------|------|:----:|-------------|
| `GET` | `/reputation/me` | ✅ Supplier | Current KPI score |
| `GET` | `/reputation/me/history` | ✅ Supplier | Historical snapshots |
| `GET` | `/reputation/provider/:id` | ✅ Admin | Provider's KPI |
| `GET` | `/reputation/provider/:id/history` | ✅ Admin | Provider history |
| `POST` | `/reputation/run-job` | ✅ Admin | Trigger cron manually |

### Operator Analytics (Admin only)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/analytics/platform/current` | Latest KPI snapshot |
| `GET` | `/analytics/platform/history` | Historical snapshots |
| `GET` | `/analytics/platform/top-performers` | Top suppliers by GMV |
| `POST` | `/analytics/run-job` | Trigger cron manually |

---

## Project Structure

```
18-UK-Dropshipping-Hub/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # Database schema (15 models)
│   │   └── migrations/            # Migration history
│   ├── docs/
│   │   ├── API_REFERENCE.md       # Public REST API v1 endpoints
│   │   └── API_GETTING_STARTED.md # Developer onboarding guide
│   ├── src/
│   │   ├── auth/                  # JWT auth, guards, strategy
│   │   ├── api/                   # Public REST API controllers & guards
│   │   ├── catalog/               # Products + CSV upload
│   │   ├── catalogue/             # Seller catalogue browsing controller
│   │   ├── orders/                # Order lifecycle + returns
│   │   ├── integrations/          # Shopify + WooCommerce webhooks
│   │   ├── payments/              # Stripe Connect checkout
│   │   ├── wallet/                # Balance ledger
│   │   ├── reputation/            # KPI scoring cron
│   │   ├── analytics/             # Platform metrics cron
│   │   ├── notifications/         # BullMQ notification handlers & preferences
│   │   ├── events/                # BullMQ processors
│   │   └── prisma/                # Prisma client module
│   └── test/
│       └── test-helper.ts         # Vitest test utilities
├── frontend/
│   └── app/
│       ├── routes/
│       │   ├── home.tsx           # Landing page
│       │   ├── auth.login.tsx     # Sign in
│       │   ├── auth.register.tsx  # Create account
│       │   ├── app.tsx            # Authenticated shell + sidebar
│       │   ├── app.dashboard.tsx  # Role-based dashboard
│       │   ├── app.orders.*.tsx   # Orders list + detail
│       │   ├── app.wallet.*.tsx   # Wallet + transactions
│       │   ├── app.products.*.tsx # Catalogue management
│       │   ├── app.catalogue.*.tsx # Wholesalers sourcing directory (markup profit tool)
│       │   ├── app.notifications._index.tsx # Alerts list and preferences dashboard
│       │   ├── app.reputation.*.tsx # KPI dashboard
│       │   └── app.analytics.*.tsx  # Operator metrics
│       ├── components/
│       │   ├── home/              # Landing page sections
│       │   ├── layout/            # Header, Footer
│       │   └── ui/                # Shared UI primitives
│       └── lib/
│           ├── api.server.ts      # Backend HTTP client
│           └── auth.server.ts     # Session management
├── docs/
│   ├── implementation_plan.md
│   └── v7-implementation_plan.md
├── docker-compose.yml
├── STATUS_PROJECT.md              # Vertical status + known issues
└── README.md
```

---

## Design System

The platform uses a cohesive design language across landing and app:

| Token | Value | Usage |
|-------|-------|-------|
| Brand dark | `#1a1a1c` | Sidebar, headings, CTAs |
| Brand accent | `#8b5cf6` | Active nav, focus rings, links |
| Background | `#f5f5f7` | App shell background |
| Surface | `#ffffff` | Cards and panels |
| Typography | Inter Tight | All text |

---

## Development Scripts

### Backend

```bash
npm run start:dev     # Watch mode
npm run build         # Production build
npm run test          # Vitest unit tests
npx prisma studio     # Database GUI
npx prisma migrate dev --name <name>  # Create migration
```

### Frontend

```bash
npm run dev           # Vite dev server
npm run build         # Production build
npm run typecheck     # TypeScript check
```

---

## Contributing

1. Branch from `main` using `feat/`, `fix/`, or `chore/` prefix
2. Follow conventional commits (`feat:`, `fix:`, `chore:`, `docs:`)
3. No `--skip-ci` bypasses without team approval
4. All API changes require updated `STATUS_PROJECT.md`

---

## License

Private — All rights reserved. UK Dropshipping Hub Ltd, registered in England & Wales.
