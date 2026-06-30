# Vertical 2 — Product Catalogue

Implementar el ciclo completo de administración de productos del catálogo (CRUD) y posibilitar la carga masiva mediante archivos CSV.

## Proposed Changes

### 1. Database Model (Prisma)
- Create `Product` model containing: `id`, `supplierId`, `sku`, `title`, `description`, `category`, `wholesalePrice`, `status` (enum: `ACTIVE`, `DRAFT`, `ARCHIVED`), and timestamps.
- Create `Inventory` model containing: `id`, `productId`, `stock`, `slaDays`.

### 2. Backend Modules (NestJS)
- **CatalogModule**: CRUD controllers for products. Create, update, and delete actions are guarded to ensure owner-only (Supplier) operations.
- **CsvParserService**: Multipart parser extracting rows from CSV uploads to bulk-save inventory lines.

### 3. Frontend Views (Remix)
- `/products`: Supplier catalog table listing inventory details.
- `/products/new`: Form to create a single product.
- `/products/upload`: Drag-and-drop CSV parser view.

## Verification Plan

### Automated Tests
- `test/catalog.integration.spec.ts`: Checks duplicate SKU prevention, ownership guards, and CSV parser execution pipelines.
