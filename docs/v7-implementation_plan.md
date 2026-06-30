# Vertical 7 — Seller Catalogue Browsing

This implementation plan covers the development of the **Seller Catalogue Browsing** vertical (V7). The goal is to turn the existing product catalogue into a seller-facing discovery and sourcing experience, with filters, reputation-aware sorting, and first-step import actions toward Shopify/WooCommerce.

---

## Objectives

- Allow SELLER users to browse and search products across all active suppliers.
- Expose filters by category, price, supplier, reputation level, and stock status.
- Provide a seller-centric product detail view (margins, supplier metrics, logistics hints).
- Implement first-iteration "import" actions (staged mappings toward Shopify/WooCommerce).
- Integrate the catalogue experience into the seller dashboard.

---

## 1. Data & Domain

### 1.1 Prisma Schema

We will extend `schema.prisma` minimally to support seller-centric catalogue actions.

#### [MODIFY] `schema.prisma`

- Ensure `Product` has the fields required for filtering:
  - `category` (string or enum).
  - `price` (numeric, already present).
  - `stock` (integer, already present).
  - `supplierId` (relation to `Supplier`).
  - `isActive` (boolean, only active products appear in seller catalogue).

- Add model `SellerProductImport` (first iteration, purely internal record):

  ```prisma
  model SellerProductImport {
    id          String   @id @default(uuid())
    sellerId    String   @map("seller_id")
    productId   String   @map("product_id")
    platform    String   @map("platform") // "SHOPIFY" | "WOOCOMMERCE" | "OTHER"
    status      String   @map("status")   // "PENDING" | "MAPPED" | "EXPORTED"
    createdAt   DateTime @default(now()) @map("created_at")
    updatedAt   DateTime @updatedAt @map("updated_at")

    seller      Seller   @relation(fields: [sellerId], references: [id])
    product     Product  @relation(fields: [productId], references: [id])

    @@index([sellerId])
    @@index([productId])
    @@map("seller_product_imports")
  }
  ```

Notes:
- We do **not** perform actual API calls to Shopify/WooCommerce in this vertical; `SellerProductImport` is a staging area for future integrations.

---

## 2. Backend — Catalogue API

We will create a dedicated catalogue controller for seller browsing, building on existing `Product` endpoints.

### 2.1 Module & Service

#### [NEW] `backend/src/catalogue/catalogue.module.ts`

- Imports: `ProductsModule`, `ReputationModule`, `AuthModule`.
- Provides: `CatalogueService`, `CatalogueController`.

#### [NEW] `backend/src/catalogue/catalogue.service.ts`

Responsibilities:

1. **Seller-facing product list**
   - Method: `getCatalogueForSeller(sellerId, filters)`.
   - Joins:
     - `Product` (base data).
     - `Supplier` (name, location).
     - Latest `ProviderKpiSnapshot` for supplier (reputationScore, level, OTD, fillRate, cancelRate, returnRate).
   - Supports filters:
     - `category` (string/enum).
     - `minPrice` / `maxPrice`.
     - `supplierId`.
     - `reputationLevel` (STANDARD / VERIFIED / PREMIUM).
     - `inStockOnly` (stock > 0).
   - Supports sorting:
     - By `reputationScore`, `price`, or `createdAt`.

2. **Seller-facing product detail**
   - Method: `getProductDetailForSeller(productId, sellerId)`.
   - Returns:
     - Product core fields (title, description, price, stock, images).
     - Supplier summary (name, location, level, reputationScore, OTD, fillRate, cancelRate, returnRate).
     - Derived fields:
       - `suggestedRetailPrice` (simple markup suggestion, e.g. price * 1.8; purely indicative).
       - `estimatedShippingWindow` (derived from supplier OTD + SLAs, for UI only).

3. **Import staging**
   - Method: `createSellerImport(sellerId, productId, platform)`.
   - Creates `SellerProductImport` with `status = "PENDING"`.

4. Optional: `listImportsForSeller(sellerId)` for later use.

### 2.2 Controller

#### [NEW] `backend/src/catalogue/catalogue.controller.ts`

Protected by `JwtAuthGuard` + `RolesGuard` (SELLER role required):

- `GET /catalogue` — seller catalogue list
  - Query params:
    - `category` (optional).
    - `minPrice` / `maxPrice`.
    - `supplierId`.
    - `reputationLevel`.
    - `inStockOnly` (boolean).
    - `sortBy` (`"reputation" | "price" | "createdAt"`).
  - Returns paginated list with:
    - Product info.
    - Supplier summary.
    - Reputation summary.

- `GET /catalogue/:id` — product detail (seller view)
  - Returns product + supplier + reputation + derived fields.

- `POST /catalogue/:id/import` — stage import
  - Body:
    - `platform`: `"SHOPIFY" | "WOOCOMMERCE" | "OTHER"`.
  - Creates `SellerProductImport` record.
  - Returns status object (for UI confirmation).

#### [MODIFY] `backend/src/app.module.ts`

- Register `CatalogueModule`.

---

## 3. Frontend — Seller Catalogue Experience

We will add seller-facing routes and components in the frontend, using React Router v7.

### 3.1 Routes

#### [NEW] `frontend/app/routes/_app.catalogue._index.tsx`

- Top-level seller catalogue page.
- Layout:
  - Left: filters panel.
  - Right: product grid/table.
- Behaviour:
  - Reads filters from URL search params (`?category=...&minPrice=...`).
  - Calls `GET /catalogue` with corresponding query params.
  - Displays products as cards with:
    - Title, supplier name, price, stock.
    - Badge for supplier level (Premium/Verified/Standard).
    - Short KPI snippet (OTD %, return rate %, reputationScore).

#### [NEW] `frontend/app/routes/_app.catalogue.$id.tsx`

- Product detail page for sellers.
- Layout:
  - Hero: product title, price, supplier badge.
  - Left: main image + key attributes.
  - Right: blocks:
    - Supplier performance metrics (OTD, fill rate, return rate).
    - Suggested retail price & margin estimate.
    - Import actions (buttons).
- Behaviour:
  - Calls `GET /catalogue/:id`.
  - Buttons:
    - `Import to Shopify` → `POST /catalogue/:id/import` with `platform = "SHOPIFY"`.
    - `Import to WooCommerce` → `POST /catalogue/:id/import` with `platform = "WOOCOMMERCE"`.
    - For now, show success toast with "Import staged".

### 3.2 Components

#### [NEW] `frontend/app/components/catalogue/CatalogueFilters.tsx`

- Controlled filter panel component:
  - Category dropdown.
  - Price range slider/inputs.
  - Supplier select (searchable).
  - Reputation level filter.
  - In-stock only toggle.
- Syncs state with URL search params.

#### [NEW] `frontend/app/components/catalogue/ProductCard.tsx`

- Displays product summary for the grid.
- Elements:
  - Title, supplier name.
  - Price (GBP), stock.
  - Reputation badge and OTD %.
  - CTA: `View details`.

#### [NEW] `frontend/app/components/catalogue/ReputationBadge.tsx`

- Visual badge for supplier level:
  - Premium → gold, trophy icon.
  - Verified → teal, check icon.
  - Standard → neutral.

### 3.3 Dashboard Integration

#### [MODIFY] `frontend/app/routes/_app.dashboard._index.tsx`

- For SELLER role:
  - Add section "Discover products" with:
    - Link to `/catalogue`.
    - Highlights: number of active suppliers, number of products.

#### [MODIFY] Sidebar / navigation

- Add "Catalogue" entry visible only to SELLER users, pointing to `/catalogue`.

---

## 4. Testing

### 4.1 Backend

#### [NEW] `backend/test/catalogue.integration.spec.ts`

Covers:

- Seller catalogue list:
  - Filters by category, price range, supplier, reputation level, stock.
  - Sorts by reputationScore, price, createdAt.
- Product detail view:
  - Returns combined data (product + supplier + latest ProviderKpiSnapshot).
- Import staging:
  - Creates `SellerProductImport` with correct sellerId, productId, platform.
  - Rejects non-SELLER roles.

#### [NEW] `backend/test/catalogue.unit.spec.ts`

Covers pure functions in `CatalogueService`:

- Filter application logic.
- Sorting logic.
- Suggested retail price calculation.

### 4.2 Frontend

#### [NEW] `frontend/app/routes/__tests__/catalogue.route.spec.tsx`

Covers:

- Rendering of `/catalogue` with mock data.
- Filter interactions updating URL search params and re-fetch.
- Product card layout and badges.

#### [NEW] `frontend/app/routes/__tests__/catalogue.detail.spec.tsx`

Covers:

- Rendering of `/catalogue/:id`.
- Display of supplier KPIs and reputation.
- Import buttons calling API and showing success feedback.

---

## 5. Rollout & Verification

### 5.1 Local Verification

1. Seed database with:
   - Multiple suppliers with varying `ReputationLevel` and KPIs.
   - Products across categories, price ranges, stock levels.
2. Log in as SELLER.
3. Navigate to `/catalogue`:
   - Verify filters and sorting.
   - Verify that suppliers with better KPIs appear when sorting by reputation.
4. Open `/catalogue/:id`:
   - Validate imported data points and derived fields.
   - Test import buttons and confirm `SellerProductImport` records are created.

### 5.2 Staging / Demo

- Prepare demo users:
  - One seller with no imports yet.
  - One seller with several staged imports.
- Use staging environment to showcase:
  - Discoverability of UK suppliers.
  - Reputation-aware decision making.
  - First-step import workflow.

---

## 6. Tasks Summary

| Phase | Area                      | Tasks |
|-------|---------------------------|-------|
| 1     | Data & Prisma             | Add `SellerProductImport`, ensure product fields for filtering |
| 2     | Backend Catalogue API     | Implement `CatalogueService` + `CatalogueController` |
| 3     | Frontend Routes           | Add `/catalogue` and `/catalogue/:id` seller views |
| 4     | Components & Dashboard    | Filters, cards, badges, dashboard entry |
| 5     | Testing                   | Integration + unit tests backend/frontend |
| 6     | Rollout & Verification    | Local + staging walkthrough |
