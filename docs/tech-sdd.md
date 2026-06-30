# Software Design Document (SDD) – UK Dropshipping Hub

## 1. Introducción

### 1.1 Propósito

Este SDD describe la arquitectura y el diseño del sistema “UK Dropshipping Hub” para servir como referencia principal de implementación y revisión técnica.

### 1.2 Alcance

Cubre:
- Arquitectura lógica y física.
- Servicios principales y sus responsabilidades.
- Modelo de datos (ERD de alto nivel).
- Interfaces internas (APIs).
- Consideraciones de seguridad, rendimiento y despliegue.

### 1.3 Referencias

- `business-brief.md`
- `product-spec.md` (SRS)
- Documentación de APIs externas (Shopify, WooCommerce, Stripe, carriers).
- Especificaciones SDD IEEE 1016.[web:139][web:141]

---

## 2. System Overview

El sistema es una plataforma web B2B multi‑tenant que expone:
- Panel web para proveedores y sellers.
- APIs para integraciones (tiendas externas, carriers).
- Servicios backend modulares basados en Node.js/NestJS, con base de datos relacional (PostgreSQL) y bus de eventos.

---

## 3. System Architecture

### 3.1 Architectural Design

#### 3.1.1 Componentes principales

- **Frontend Web**  
  - Framework: Remix (o Next.js, pendiente decisión final).
  - SSR y rutas protegidas por rol.
  - Panel unificado para sellers y proveedores.

- **Backend API Gateway**  
  - NestJS.
  - Exposición de REST/GraphQL para frontend y terceros.

- **Servicios internos (microservicios ligeros)**  
  - Auth & Accounts Service.
  - Suppliers Service.
  - Sellers Service.
  - Catalog Service.
  - Orders & Fulfilment Service.
  - Payments & Wallet Service.
  - Reputation & Metrics Service.
  - Integrations Service (Shopify/Woo, carriers).

- **Bases de datos y almacenamiento**  
  - PostgreSQL (modelo relacional principal).
  - Redis (cache, sesiones, colas ligeras).
  - Bus de eventos (Kafka/Redpanda/NATS).[web:104][web:107][web:110]

#### 3.1.2 Patrón de comunicación

- Sincronía: REST/GraphQL entre frontend y API Gateway, y entre servicios internos cuando sea necesario.
- Asincronía: eventos publicados en el bus (ej. `OrderCreated`, `OrderStatusChanged`, `PayoutCompleted`) consumidos por servicios interesados.[web:104][web:107][web:110]

### 3.2 Decomposition Description

#### 3.2.1 Auth & Accounts Service

- Responsabilidades:
  - Registro y login de usuarios.
  - Gestión de roles (supplier, seller, admin).
- Interfaces:
  - `/auth/register`, `/auth/login`, `/auth/me`, etc.

#### 3.2.2 Suppliers Service

- Responsabilidades:
  - Gestión de perfil del proveedor.
  - Configuración de SLA, métodos de envío.
- Interfaces:
  - `/suppliers/{id}`, `/suppliers/settings`, etc.

#### 3.2.3 Sellers Service

- Responsabilidades:
  - Gestión de cuentas de seller.
  - Conexiones con tiendas externas (Shopify/Woo).
- Interfaces:
  - `/sellers/{id}`, `/sellers/store-connections`.

#### 3.2.4 Catalog Service

- Responsabilidades:
  - Entidades Product, Inventory.
  - Búsqueda y filtrado.
- Interfaces:
  - `/products`, `/products/search`, `/inventory`.

#### 3.2.5 Orders & Fulfilment Service

- Responsabilidades:
  - Representar pedidos, estados, relación seller/proveedor.
  - Procesar eventos de cambios de estado.
- Interfaces:
  - `/orders`, `/orders/{id}`, `/orders/{id}/status`.

#### 3.2.6 Payments & Wallet Service

- Responsabilidades:
  - Representar transacciones y balances internos.
  - Calcular y aplicar split de pagos (supplier vs plataforma).
- Interfaces:
  - `/wallets`, `/transactions`, `/payouts`.

#### 3.2.7 Reputation & Metrics Service

- Responsabilidades:
  - Calcular métricas (OTD, cancelaciones, devoluciones).
  - Asignar niveles (Standard, Verified, Premium).
- Interfaces:
  - `/reputation/provider/{id}`, `/metrics`.

#### 3.2.8 Integrations Service

- Responsabilidades:
  - Conectar con Shopify/WooCommerce.
  - Conectar con carriers.
- Interfaces:
  - Webhooks entrantes (Shopify/Woo).
  - Clientes HTTP para APIs externas.

### 3.3 Design Rationale

- Se elige arquitectura modular + event‑driven por:
  - Escalabilidad horizontal.
  - Separación clara de dominios.
  - Soporte para flujos asincrónicos (pedidos, pagos, reputación).[web:104][web:107][web:110]
- Se prioriza SSR y frameworks modernos (Remix/Next) por rendimiento y UX.[web:103][web:109][web:112]

---

## 4. Data Design

### 4.1 Data Description

Principales entidades (simplificado):

- `User(id, email, password_hash, role)`  
- `Supplier(id, user_id, company_name, vat_number, address, status)`  
- `Seller(id, user_id, store_platform, store_url, status)`  
- `Product(id, supplier_id, sku, title, description, category, wholesale_price, created_at)`  
- `Inventory(id, product_id, stock, sla_days, updated_at)`  
- `Order(id, external_order_id, seller_id, supplier_id, status, total_amount, created_at)`  
- `OrderItem(id, order_id, product_id, quantity, unit_price)`  
- `Shipment(id, order_id, carrier, tracking_code, status, dispatched_at, delivered_at)`  
- `Transaction(id, order_id, seller_amount, supplier_amount, platform_fee, status)`  
- `Wallet(id, owner_type, owner_id, balance)`  
- `ReputationSnapshot(id, supplier_id, otd_percentage, cancel_rate, return_rate, window_start, window_end, level)`  

### 4.2 Data Dictionary

(Enumerar cada entidad, atributos, tipos, y relaciones; puede ampliarse en siguiente iteración.)

---

## 5. Component Design

(Aquí irás bajando a pseudo‑código/algoritmos para cosas clave, por ejemplo: cálculo de reputación, reglas de split de pagos, manejo de eventos de pedido.)

---

## 6. Human Interface Design

### 6.1 Overview of User Interface

- Dashboards separados según rol (supplier/seller).
- Navegación principal:
  - Home / Dashboard.
  - Catálogo.
  - Pedidos.
  - Reputación.
  - Configuración.

### 6.2 Screen Images

(Bocetos iniciales de pantallas, aunque sean wireframes.)

---

## 7. Requirements Matrix

- Matriz para trazar requisitos del `product-spec.md` (FR-XXX) con componentes/servicios y endpoints que los satisfacen.

---

## 8. Appendices

- Diagramas detallados.
- Esquemas de despliegue.