# Third Vertical — Payments & Wallet

Implementar el flujo de pagos de extremo a extremo: registrar pagos de clientes, reflejar balances internos (wallet), aplicar la comisión de la plataforma (3–5 %) y preparar la base para payouts a proveedores y reconciliación.  
Scope: implementa FR-030 y FR-031 del `product-spec.md` (registro de transacciones y split interno).[web:163][web:175]  
Reputación (FR-040/041) se abordará en un vertical posterior.

## User Review Required

> [!IMPORTANT]
> **Modelo de pagos: Stripe Connect (Express)**
> Para multi‑parte payments (seller + plataforma + proveedor) se recomienda usar **Stripe Connect**:
> - Cada seller/proveedor tiene un `connected account`.
> - Práctica estándar en marketplaces: usar `destination charges` o `separate charges and transfers` para dividir el pago entre la plataforma y los vendedores.[web:162][web:163][web:168][web:171][web:174][web:175]
> - Stripe asume gran parte de KYC/AML y cumplimiento, reduciendo tu carga regulatoria.[web:168][web:171][web:174][web:175]

> [!IMPORTANT]
> **Modelo Merchant of Record**
> En este vertical asumimos que:
> - El **seller** es el merchant of record frente al cliente final (como en tu SRS).
> - Tu plataforma actúa como “SaaS de operaciones y pagos”:
>   - Recibe información del cobro (Intent/Charge).
>   - Usa Connect para extraer su fee (application_fee_amount) y dejar el resto en el balance del seller/proveedor.[web:163][web:169][web:175]

> [!WARNING]
> **Cumplimiento UK**
> Gestionar pagos múltiples implica:
> - KYC de sellers/proveedores.
> - Posible obligación de registro como “payment institution” si mueves fondos fuera de plataformas reguladas.
> Usando Stripe Connect reduces mucho esta carga (licencias, informes, etc.), pero no la eliminas al 100 %.[web:168][web:174][web:176]

## Open Questions

> [!IMPORTANT]
> **Quién tiene el Stripe account: seller vs proveedor**
> Opciones:
> - A) Cada seller tiene su connected account; proveedores cobran vía sellers (simplifica tu rol).
> - B) Cada proveedor tiene su connected account y tú/seller eres merchant de cara al cliente.
> La opción A suele ser más simple al principio; la B te da más control sobre payouts. Decide un modelo inicial antes de implementar.

---

## Proposed Changes

### Phase 1: Domain & Data (Prisma)

#### [MODIFY] `schema.prisma`
Añadir nuevas entidades:

- `Transaction`:
  - `id`
  - `orderId` (FK Order)
  - `stripePaymentIntentId` (string)
  - `stripeChargeId` (string, opcional)
  - `sellerId` (FK Seller)
  - `supplierId` (FK Supplier, opcional según modelo elegido)
  - `grossAmount` (importe total cobrado al cliente)
  - `platformFeeAmount`
  - `sellerNetAmount`
  - `supplierNetAmount` (si aplicas split directo al proveedor)
  - `currency`
  - `status` (enum: `PENDING`, `SUCCEEDED`, `REFUNDED`, `FAILED`)
  - timestamps

- `Wallet` (simplificado para este vertical):
  - `id`
  - `ownerType` (enum: `SELLER`, `SUPPLIER`)
  - `ownerId` (FK Seller/Supplier)
  - `balance` (numeric)
  - `currency`

- Opcional: `PayoutRequest` para futuro (no necesario en este vertical, pero puedes dejarlo previsto).

`@@unique` idempotente:
- `@@unique([stripePaymentIntentId])` para no registrar dos veces la misma transacción.

---

### Phase 2: Stripe Connect Integration (Backend)

#### [NEW] backend/src/payments/payments.module.ts

- Importa PrismaService, OrdersModule, SellersModule (y SuppliersModule si aplicas modelo B).
- Configura `Stripe` client con API keys desde `.env`.

#### [NEW] backend/src/payments/payments.service.ts

Responsabilidades:

1. **Registrar pago desde webhook Stripe**
   - Endpoint webhook (otro módulo, ver Phase 3) recibe eventos como `payment_intent.succeeded` o `charge.succeeded`.[web:163][web:169][web:175]
   - `payments.service`:
     - Verifica metadata (`orderId`, `sellerId`, `supplierId` si aplica).
     - Calcula:
       - `platformFeeAmount` (3–5 % según reglas de tu modelo).
       - `sellerNetAmount` (gross − plataforma − proveedor si hay).
       - `supplierNetAmount` (si usas split directo).
     - Crea `Transaction` con `status=SUCCEEDED`.
     - Actualiza `Wallet` del seller/proveedor (sumando netAmount).

2. **Crear PaymentIntent / Checkout Session** (si tu plataforma dispara el cobro)
   - Método `createCheckoutSession(order)`:
     - Usa `destination charges` o `separate charges and transfers`:
       - `transfer_data.destination`: ID del connected account del seller/proveedor.[web:169][web:175]
       - `application_fee_amount`: tu comisión en céntimos.[web:163][web:169]
     - Devuelve URL de checkout al seller para que redirija al cliente.

3. **Reflejar refunds/cancellations**
   - Métodos para manejar webhooks `charge.refunded`:
     - Actualizar `Transaction.status` a `REFUNDED`.
     - Ajustar balances en `Wallet` (restar amounts).
     - Marcar `Order.status` en consecuencia (según tu SRS).

#### Política de comisión

- Configurar un servicio/utility de fees:
  - `calculatePlatformFee(grossAmount)` → 3–5 % configurable.
  - `calculateSellerNet(grossAmount, fee, supplierShare)`.

---

### Phase 3: Stripe Webhooks Module

#### [NEW] backend/src/payments/webhooks.controller.ts

- Endpoint: `POST /webhooks/stripe`
- Manejo:
  - Uso del raw body para verificar firma (`Stripe-Signature` header).
  - Uso de `stripe.webhooks.constructEvent` para validar eventos.[web:163][web:169]
  - En prod/staging: firma inválida → 400/401.
  - En dev: opción de bypass controlado (similar a Shopify/Woo, sólo `NODE_ENV=development`).

Eventos clave:

- `payment_intent.succeeded` / `charge.succeeded` → llamar `payments.service.handlePaymentSucceeded(event)`.
- `charge.refunded` → llamar `payments.service.handleRefunded(event)`.

---

### Phase 4: Wallet Service & Balances

#### [NEW] backend/src/wallet/wallet.module.ts

#### [NEW] backend/src/wallet/wallet.service.ts

Responsabilidades:

- `getBalance(ownerType, ownerId)`:
  - Devolver balance actual (para mostrar en panel).
- `applyCredit(ownerType, ownerId, amount)`:
  - Sumar netAmount a partir de `Transaction` exitosa.
- `applyDebit(ownerType, ownerId, amount)`:
  - Restar en caso de refund/payout.

Opcional en este vertical:
- `wallet.controller.ts` para `GET /wallet/me` (proveer balance al frontend).

Nota: Stripe Connect ya mantiene balances a nivel de cuenta; tu `Wallet` interno sirve para reflejar información agregada de forma rápida y para lógica interna de reputación/control.[web:163][web:169][web:175]

---

### Phase 5: Frontend – Payments & Wallet UI

#### [NEW] frontend/app/routes/_app.wallet._index.tsx

- Pantalla con:
  - Balance actual (por seller/proveedor).
  - Lista resumida de transacciones (últimas X).
  - Indicadores:
    - Ingresos brutos.
    - Fee plataforma aplicado.
    - Netos recibidos.

#### [NEW] frontend/app/routes/_app.orders.$id.payments.tsx (opcional)

- Subvista dentro de detalle de pedido:
  - Información de pago:
    - Estado (pending, succeeded, refunded).
    - Monto bruto, fee, netos.
  - En este vertical no implementamos aún UI de “payout manual”, sólo visibilidad.

---

### Phase 6: Testing

#### Integración (Vitest + supertest)

- Webhook Stripe:
  - `payment_intent.succeeded`:
    - Caso feliz: se crea `Transaction`, se actualiza `Wallet`.
    - Caso con PaymentIntent duplicado: idempotencia (no se crea Transaction duplicada gracias a `@@unique`).
  - `charge.refunded`:
    - Cambios correctos de `Transaction.status` y ajustes en `Wallet`.

- Lógica de fees:
  - Tests unitarios para `calculatePlatformFee` y `calculateSellerNet`:
    - Diferentes montos / %.
    - Redondeo correcto (céntimos).

#### Unit tests

- `payments.service`:
  - Manejo de eventos falsos (sin metadata).
  - Manejo de sellers/proveedores inexistentes.
- `wallet.service`:
  - Créditos y débitos, protección contra balances negativos (si decides aplicar reglas).

---

## Verification Plan

### Automated Tests

```bash
# Ejecutar suite backend (incluyendo payments/wallet)
cd backend && npm run test
```

### Manual Verification

1. Crear un pedido de prueba vía frontend (seller).
2. Simular checkout (según integración elegida: Stripe Checkout/PaymentIntent).
3. En modo test de Stripe:
   - Confirmar el PaymentIntent.
   - Ver en el dashboard de Stripe:
     - Aplicación del `application_fee_amount` (tu comisión).
     - Transferencia al connected account del seller/proveedor.[web:163][web:169][web:175]
4. Ver en tu app:
   - `Transaction` registrada.
   - `Wallet` del seller/proveedor actualizado con netAmount.
5. Simular refund en Stripe:
   - Comprobar que `Transaction.status=REFUNDED` y el balance se ajusta.

---

## Implementation Order

| Phase           | Tasks | Focus                                          |
|-----------------|-------|------------------------------------------------|
| 1 — Data        | 6     | Nuevos modelos Transaction/Wallet              |
| 2 — Stripe Core | 8     | PaymentsModule, lógica de split y registro     |
| 3 — Webhooks    | 5     | Endpoint Stripe, verificación firma            |
| 4 — Wallet      | 5     | Servicio de balances + API básica              |
| 5 — Frontend    | 6     | UI de wallet y detalle de pago                 |
| 6 — Testing     | 8     | Integración y unit tests                       |
| 7 — Polish      | 2     | Docs, README, notas de configuración           |
| **Total**       | **40**|                                                |