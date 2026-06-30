# Product Specification – UK Dropshipping Hub (SRS)

## 1. Introducción

### 1.1 Propósito

Este documento define los requisitos funcionales y no funcionales del sistema “UK Dropshipping Hub”, plataforma B2B que conecta proveedores y sellers en Reino Unido.

### 1.2 Alcance

El sistema cubrirá:
- Onboarding y gestión de cuentas de proveedores y sellers.
- Publicación y gestión de catálogos de productos.
- Integración con tiendas externas (inicialmente Shopify y WooCommerce).
- Gestión de pedidos y estado logístico (order → shipment → delivery).
- Registro y distribución interno de pagos (wallet).
- Cálculo y visualización de reputación de proveedores y sellers.

No cubrirá:
- Pasarela de pago propia hacia el cliente final.
- Gestión de marketing del seller (ads, SEO, etc.).

### 1.3 Audiencia

- Fundadores y equipo de producto.
- Equipo de ingeniería (backend, frontend, DevOps).
- Colaboradores externos (legal, logística).

### 1.4 Definiciones y acrónimos

- Seller: cliente de la plataforma que vende al consumidor final.
- Proveedor: empresa que suministra productos y realiza el envío.
- OTD: On-Time Delivery, % de pedidos entregados dentro del plazo acordado.
- GMV: Gross Merchandise Volume, volumen bruto de ventas gestionadas.
- SDD: Software Design Document.
- SRS: Software Requirements Specification.

---

## 2. Descripción general

### 2.1 Necesidades de usuario

**Proveedores:**
- Subir y mantener su catálogo con el mínimo dolor.
- Ver pedidos y estados de envío en un solo lugar.
- Recibir pagos de forma clara y puntual.

**Sellers:**
- Encontrar proveedores confiables y productos relevantes.
- Integrar productos en su tienda sin tareas manuales repetitivas.
- Minimizar riesgos de cancelaciones y devoluciones.

### 2.2 Suposiciones y dependencias

- Los sellers ya tienen tienda online (Shopify/Woo).
- Proveedores pueden preparar y enviar pedidos unitarios.
- Pasarela de pagos externa (ej. Stripe) usada por sellers; el hub registra datos de pago para split interno.

---

## 3. Requisitos funcionales

> Cada requisito debería tener un ID único (ej. FR-001) y criterios de aceptación claros.

### 3.1 Gestión de cuentas

**FR-001 – Registro de proveedor**
- Como proveedor, quiero registrarme con datos básicos (empresa, VAT, categorías) para acceder al panel.
- Criterios de aceptación:
  - Campos obligatorios: nombre empresa, email, VAT, dirección fiscal.
  - Validaciones básicas: formato email, longitud mínima de contraseña.
  - Activación vía correo de verificación.

**FR-002 – Registro de seller**
- Como seller, quiero crear una cuenta y vincular mi tienda para empezar a importar productos.
- Criterios:
  - Campos obligatorios: nombre, email, tienda (URL), plataforma (Shopify/Woo).
  - OAuth / API para conectar tienda cuando aplique.

### 3.2 Catálogo

**FR-010 – Alta de productos (proveedor)**
- El proveedor puede crear, editar y desactivar productos.
- Criterios:
  - Campos mínimos: SKU interno, título, descripción, precio mayorista, stock, SLA de envío, categoría.
  - Validación de categorías contra taxonomía estándar.
  - Posibilidad de upload CSV para múltiples productos.

**FR-011 – Exploración de catálogo (seller)**
- El seller puede filtrar productos por proveedor, categoría, precio, reputación.
- Criterios:
  - Filtros combinables.
  - Ordenación por relevancia, precio, reputación.

**FR-012 – Importación en tienda**
- Como seller, quiero importar productos seleccionados a mi tienda externa con reglas de pricing.
- Criterios:
  - Definir markup (%).
  - Sincronizar título, descripción, precio y stock básico.
  - Manejar errores de integración (log y feedback al usuario).

### 3.3 Pedidos y logística

**FR-020 – Registro de pedido**
- Cuando un cliente final compra en la tienda del seller, el sistema debe registrar un pedido interno y notificar al proveedor.
- Criterios:
  - Datos mínimos: ID pedido tienda, seller, proveedor, productos, cantidades, dirección envío, importe.
  - Creación de estado inicial: `PENDING_SUPPLIER`.

**FR-021 – Actualización de estado**
- El proveedor actualiza estados (`ACCEPTED`, `SHIPPED`, `DELIVERED`, `CANCELLED`).
- Criterios:
  - Historial de cambios con timestamps.
  - Notificación al seller cuando cambia el estado.

**FR-022 – Gestión de devoluciones**
- El seller puede marcar un pedido como devolución; el proveedor puede aceptar o disputar.
- Criterios:
  - Estados de devolución (`REQUESTED`, `APPROVED`, `REJECTED`, `REFUNDED`).
  - Registro de motivo.

### 3.4 Pagos y wallet

**FR-030 – Registro de transacciones**
- El sistema debe registrar información de pagos del seller (importe, fecha, pedido asociado).
- Criterios:
  - Mantener trazabilidad: pedido → transacción → split interno.
  - No almacenar datos sensibles de tarjeta (cumplimiento PCI).

**FR-031 – Split interno**
- Para cada pedido, el sistema calcula:
  - Importe para proveedor.
  - Fee plataforma (3–5 % inicial).
- Criterios:
  - Fórmula documentada.
  - Estados de pago interno: `PENDING_PAYOUT`, `PAID_SUPPLIER`.

### 3.5 Reputación y métricas

**FR-040 – Cálculo de reputación de proveedor**
- El sistema calcula OTD, % cancelaciones y devoluciones por proveedor.
- Criterios:
  - Ventana configurable (por defecto 90 días).
  - Visualización en panel de seller al elegir proveedor.

**FR-041 – Niveles de proveedor**
- El sistema asigna niveles (Standard, Verified, Premium) con base en métricas.
- Criterios:
  - Reglas claras y documentadas.
  - Actualización periódica (ej. diaria).

---

## 4. Requisitos no funcionales

### 4.1 Rendimiento

- Tiempo de respuesta típico en panel (< 300 ms en vistas comunes).
- Páginas críticas (dashboard, listado de pedidos): TTFB consistente con SSR.[web:103][web:109][web:112]

### 4.2 Seguridad

- Autenticación con tokens (ej. JWT) y refresh seguro.
- Autorización por roles (supplier, seller, admin).
- Cumplimiento básico de UK‑GDPR.

### 4.3 Disponibilidad y fiabilidad

- SLA interno objetivo: 99.5 % uptime para panel y APIs core.
- Mecanismos de retry para eventos críticos (registro de pedidos, cambios de estado).

### 4.4 Observabilidad

- Logging estructurado.
- Métricas básicas: latencia, errores, throughput.
- Trazas para flujos de pedido y pago.

---

## 5. Interfaces externas

- Shopify API (products, orders).
- WooCommerce API.
- Pasarela de pago (ej. Stripe).
- APIs de carriers (Royal Mail, DPD, Evri, etc.).

---

## 6. Aceptación y verificación

- Cada FR tendrá casos de prueba asociados (manuales y automáticos).
- Se utilizará la SRS como contrato para validar entregables de desarrollo.