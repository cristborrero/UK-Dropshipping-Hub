# Vertical 1 — Authentication & Onboarding

Implementar el sistema de registro de usuarios, autenticación y ciclo inicial de alta del perfil de proveedores y sellers.

## Proposed Changes

### 1. Database Model (Prisma)
- Create `User` model with fields: `id`, `email`, `passwordHash`, `role` (enum: `SUPPLIER`, `SELLER`, `ADMIN`), and timestamps.
- Create `Supplier` model with fields: `id`, `userId`, `companyName`, `vat`, `address`, `status` (enum: `PENDING`, `ACTIVE`).
- Create `Seller` model with fields: `id`, `userId`, `storePlatform`, `storeUrl`.

### 2. Backend Modules (NestJS)
- **AuthModule**: Implement register/login endpoints using Passport and JWT tokens (access and refresh token patterns).
- **SuppliersModule**: Implement profile retrieval and updates (`PATCH /suppliers/me`). Setting company details validates VAT and transitions status to `ACTIVE`.

### 3. Frontend Views (Remix)
- `/login`: Form to sign in.
- `/register`: Registration form supporting role selection and initial fields.
- `/onboarding`: Onboarding page for Suppliers to configure active profile parameters.

## Verification Plan

### Automated Tests
- `test/auth.integration.spec.ts`: Checks duplicate email prevention, role validations, login, and jwt token validation.
- `test/suppliers.integration.spec.ts`: Checks profile creation, updates, and validation errors.
