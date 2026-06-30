# Vertical 8 — Notifications

This implementation plan covers the development of the **Notifications** vertical (V8). The goal is to notify Sellers and Suppliers of key lifecycle events (orders, payments, returns) via in-app notifications and email, using BullMQ and NestJS best practices.

---

## Objectives

- Provide in-app notification center for authenticated users (SELLER / SUPPLIER / ADMIN).
- Send transactional email notifications for important events.
- Use BullMQ for async processing and retry of notifications.
- Make notification preferences configurable per user (first iteration: coarse-grained).

---

## 1. Data & Domain

### 1.1 Prisma Schema

We will extend `schema.prisma` with notification-related models.

#### [MODIFY] `schema.prisma`

Add model `Notification`:

```prisma
model Notification {
  id          String   @id @default(uuid())
  userId      String   @map("user_id")
  type        String   @map("type")      // e.g. "ORDER_STATUS", "PAYMENT", "RETURN"
  title       String   @map("title")
  body        String   @map("body")
  data        Json?    @map("data")      // structured payload (orderId, etc.)
  isRead      Boolean  @default(false) @map("is_read")
  createdAt   DateTime @default(now()) @map("created_at")

  user        User     @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([type])
  @@map("notifications")
}
```

Add model `NotificationPreference` (first iteration, per user):

```prisma
model NotificationPreference {
  id                  String   @id @default(uuid())
  userId              String   @unique @map("user_id")
  emailOrderStatus    Boolean  @default(true)  @map("email_order_status")
  emailPaymentEvents  Boolean  @default(true)  @map("email_payment_events")
  emailReturns        Boolean  @default(true)  @map("email_returns")
  inAppOrderStatus    Boolean  @default(true)  @map("inapp_order_status")
  inAppPaymentEvents  Boolean  @default(true)  @map("inapp_payment_events")
  inAppReturns        Boolean  @default(true)  @map("inapp_returns")
  createdAt           DateTime @default(now()) @map("created_at")
  updatedAt           DateTime @updatedAt      @map("updated_at")

  user                User     @relation(fields: [userId], references: [id])

  @@map("notification_preferences")
}
```

---

## 2. Backend — Notification Engine

### 2.1 BullMQ Queue

Define a new queue for notifications.

#### [NEW] `backend/src/notifications/notifications.queue.ts`

- BullMQ queue name: `notifications`.
- Payload shape:

```ts
export type NotificationJob = {
  userId: string;
  type: 'ORDER_STATUS' | 'PAYMENT' | 'RETURN';
  title: string;
  body: string;
  data?: Record<string, any>;
};
```

### 2.2 Notification Service

#### [NEW] `backend/src/notifications/notifications.service.ts`

Responsibilities:

1. **Enqueue notifications**
   - Methods:
     - `notifyOrderStatus(userId, orderId, oldStatus, newStatus)`.
     - `notifyPayment(userId, transactionId, status)`.
     - `notifyReturn(userId, orderId, returnStatus)`.
   - Each method:
     - Builds `NotificationJob` with title/body.
     - Pushes job onto `notifications` queue.

2. **Process queue**
   - BullMQ worker that:
     - Reads `NotificationPreference` for the user.
     - Persists `Notification` record (in-app).
     - Triggers email sending if preferences allow.

3. **Preference management**
   - Methods to get/update `NotificationPreference` per user.

#### [NEW] `backend/src/notifications/notifications.processor.ts`

- BullMQ worker implementation:
  - `processNotification(job: Job<NotificationJob>)`.
  - Handles persistence and email dispatch.

### 2.3 Email Integration

#### [NEW] `backend/src/notifications/email.service.ts`

- Wraps chosen email provider (e.g. Resend, SendGrid, or SMTP).
- Provides methods:
  - `sendOrderStatusEmail(user, order, job)`.
  - `sendPaymentEmail(user, transaction, job)`.
  - `sendReturnEmail(user, order, job)`.
- Uses simple text/HTML templates stored locally.

### 2.4 Controller

#### [NEW] `backend/src/notifications/notifications.controller.ts`

Protected by `JwtAuthGuard`:

- `GET /notifications` — list current user's notifications
  - Query params: `page`, `pageSize`.

- `PATCH /notifications/:id/read` — mark as read

- `GET /notifications/preferences` — get current user's preferences

- `PATCH /notifications/preferences` — update preferences
  - Body: partial of `NotificationPreference` flags.

#### [MODIFY] `backend/src/app.module.ts`

- Register `NotificationsModule`.

---

## 3. Event Hooks (Orders & Payments)

We will hook into existing modules so that events trigger notifications.

### 3.1 Orders

#### [MODIFY] `OrdersService` / relevant service

- When an order status changes via `PATCH /orders/:id/status`:
  - Determine affected user(s): seller and/or supplier.
  - Call `NotificationsService.notifyOrderStatus`. 

- When a return request is created or processed:
  - Call `NotificationsService.notifyReturn` for both parties.

### 3.2 Payments

#### [MODIFY] `PaymentsService` / Stripe webhook handler

- On `payment_intent.succeeded` / `charge.refunded`:
  - Determine owner(s) of wallets affected.
  - Call `NotificationsService.notifyPayment`.

---

## 4. Frontend — Notification UI

### 4.1 Notification Center

#### [NEW] `frontend/app/routes/_app.notifications._index.tsx`

- Page showing current user's notifications in a list.
- Features:
  - Filters by type (`ORDER_STATUS`, `PAYMENT`, `RETURN`).
  - Unread indicator.
  - Pagination / infinite scroll.
  - Clicking a notification navigates to the relevant resource:
    - Order detail page.
    - Wallet/transaction view.

### 4.2 Topbar Badge

#### [MODIFY] `frontend/app/routes/app.tsx` (or main layout)

- Add bell icon with unread count badge:
  - Calls `GET /notifications?page=1&pageSize=5`.
  - Shows dropdown preview of latest notifications.
  - Link to `/notifications` for full view.

### 4.3 Preferences UI

#### [NEW] `frontend/app/routes/_app.settings.notifications.tsx`

- Simple form bound to `NotificationPreference` flags:
  - Toggles for email and in-app per event type.
- Calls `GET /notifications/preferences` and `PATCH /notifications/preferences`.

---

## 5. Testing

### 5.1 Backend

#### [NEW] `backend/test/notifications.integration.spec.ts`

Covers:

- Creating notifications via Orders and Payments events.
- Respecting Preferences (no email when flags are false).
- Listing notifications for a user, marking as read.

#### [NEW] `backend/test/notifications.unit.spec.ts`

Covers pure logic in `NotificationsService` and email templates.

### 5.2 Frontend

#### [NEW] `frontend/app/routes/__tests__/notifications.route.spec.tsx`

Covers:

- Rendering of notification list with mock data.
- Mark-as-read interactions.
- Navigation to linked resources.

#### [NEW] `frontend/app/routes/__tests__/notifications.preferences.spec.tsx`

Covers:

- Loading and updating notification preferences.

---

## 6. Rollout & Verification

### 6.1 Local Verification

1. Log in as SELLER and SUPPLIER.
2. Trigger events:
   - Change order statuses.
   - Create and process return requests.
   - Simulate Stripe webhook events (payment success and refund).
3. Confirm:
   - Notifications appear in `/notifications`.
   - Email notifications are sent according to preferences.
   - Unread badge updates correctly.

### 6.2 Staging / Demo

- Prepare demo users with notifications history.
- Showcase notification center, bell dropdown, and email examples.

---

## 7. Tasks Summary

| Phase | Area                     | Tasks |
|-------|--------------------------|-------|
| 1     | Data & Prisma            | Add `Notification` + `NotificationPreference` models |
| 2     | Backend Engine           | BullMQ queue, `NotificationsService`, processor, email service |
| 3     | Event Hooks              | Wire orders and payments to notifications |
| 4     | Frontend UI              | Notification center, topbar badge, preferences page |
| 5     | Testing                  | Integration + unit tests backend/frontend |
| 6     | Rollout & Verification   | Local + staging walkthrough |
