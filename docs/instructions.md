# instructions.md

## project: uk-dropshipping-hub

### vision

- Hub B2B de proveedores y sellers en Reino Unido.
- Comisiones bajas (3–5 % sellers, 0 % proveedores al inicio).
- Enfoque en reputación, logística fiable y UX rápida.
- No pago contra entrega, no B2C directo.

### constraints

- UK-only en fase inicial.
- Cumplimiento básico UK-GDPR.
- Arquitectura modular + event-driven.
- Tec stack preferido:
  - Frontend: Remix (alternativa: Next.js).
  - Backend: Node.js + NestJS.
  - DB: PostgreSQL, cache Redis, bus de eventos (Kafka/NATS).

### specs

- Functional spec: `docs/product-spec.md`
- Technical design: `docs/tech-sdd.md`
- Business brief: `docs/business-brief.md`

### tasks

- Generar plan de implementación basado en specs.
- Crear estructura de proyecto:
  - `frontend/` Remix app.
  - `backend/` NestJS monorepo con módulos por servicio.
- Implementar primer vertical:
  - Registro/login.
  - Onboarding proveedor.
  - Alta de productos.
- Crear tests y validaciones que verifiquen cumplimiento de `product-spec.md`.

### notes

- No introducir nuevos features sin actualizar primero las specs.
- Mantener los documentos como fuente única de verdad (Spec-Driven Development).