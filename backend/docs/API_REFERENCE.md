# REST API Reference (v1)

The UK Dropshipping Hub exposes a stable, read-heavy public REST API under the `/api/v1` namespace. This document covers endpoints, headers, request/response formats, and rate limits.

---

## Authentication

All requests to the public API require credentials authentication.

### Authorization Headers

You can authenticate using one of the following methods:

1. **Custom Header (x-api-key)**:
   ```http
   GET /api/v1/products HTTP/1.1
   x-api-key: your_api_key_here
   ```

2. **Authorization Header (ApiKey Scheme)**:
   ```http
   GET /api/v1/products HTTP/1.1
   Authorization: ApiKey your_api_key_here
   ```

Failed authentication yields:
- `401 Unauthorized` with `{ "message": "API key is missing" }` or `{ "message": "Invalid or inactive API key" }`.

---

## Rate Limiting

API keys are throttled in-memory to prevent abuse:
- **Limit**: 100 requests per minute per API key.
- **Exceeded limit**: Yields `429 Too Many Requests` with `{ "message": "Rate limit exceeded. Maximum 100 requests per minute." }`.

---

## Endpoint Index

### 1. Products

#### GET `/api/v1/products`
Retrieves a paginated list of catalog products marked as `ACTIVE`.

- **Query Parameters**:
  - `page` (integer, default: 1)
  - `pageSize` (integer, default: 20)
  - `category` (string, filter by exact category)
  - `supplierId` (string, filter by exact supplier UUID)
  - `minPrice` (float, minimum wholesale price in GBP)
  - `maxPrice` (float, maximum wholesale price in GBP)
  - `inStockOnly` (`true` | `false`, filter products with stock > 0)

- **Example Response**:
  ```json
  {
    "items": [
      {
        "id": "prod-uuid-1",
        "supplierId": "supplier-uuid-1",
        "sku": "ELEC-HEAD-001",
        "title": "Noise Cancelling Headphones",
        "description": "Premium Bluetooth headphones",
        "category": "Electronics",
        "wholesalePrice": 49.99,
        "status": "ACTIVE",
        "createdAt": "2026-06-30T10:00:00.000Z",
        "inventory": {
          "stock": 25,
          "slaDays": 2
        },
        "supplier": {
          "id": "supplier-uuid-1",
          "companyName": "TechWholesale LTD"
        }
      }
    ],
    "meta": {
      "page": 1,
      "pageSize": 20,
      "total": 1,
      "totalPages": 1
    }
  }
  ```

#### GET `/api/v1/products/:id`
Retrieves details for a single product.

- **Example Response**:
  ```json
  {
    "id": "prod-uuid-1",
    "supplierId": "supplier-uuid-1",
    "sku": "ELEC-HEAD-001",
    "title": "Noise Cancelling Headphones",
    "description": "Premium Bluetooth headphones",
    "category": "Electronics",
    "wholesalePrice": 49.99,
    "status": "ACTIVE",
    "inventory": {
      "stock": 25,
      "slaDays": 2
    },
    "supplier": {
      "id": "supplier-uuid-1",
      "companyName": "TechWholesale LTD"
    }
  }
  ```

---

### 2. Suppliers

#### GET `/api/v1/suppliers`
Lists all active suppliers with their aggregate OTD rates.

- **Example Response**:
  ```json
  [
    {
      "id": "supplier-uuid-1",
      "companyName": "TechWholesale LTD",
      "reputationLevel": "ELITE",
      "onTimeDeliveryRate": 99.4
    }
  ]
  ```

#### GET `/api/v1/suppliers/:id`
Retrieves supplier info and their latest KPI snapshots.

- **Example Response**:
  ```json
  {
    "id": "supplier-uuid-1",
    "companyName": "TechWholesale LTD",
    "reputationLevel": "ELITE",
    "onTimeDeliveryRate": 99.4,
    "kpi": {
      "id": "kpi-uuid-1",
      "supplierId": "supplier-uuid-1",
      "windowStart": "2026-06-01T00:00:00.000Z",
      "windowEnd": "2026-06-30T00:00:00.000Z",
      "ordersTotal": 450,
      "otdPercentage": 99.4,
      "fillRatePercentage": 98.2,
      "cancelRatePercentage": 0.5,
      "returnRatePercentage": 1.2,
      "reputationScore": 99.1,
      "level": "ELITE"
    }
  }
  ```

---

### 3. Orders

#### GET `/api/v1/orders`
Lists recent orders in read-only format. Sensitive customer names, phone numbers, and addresses are automatically cleaned/omitted.

- **Example Response**:
  ```json
  [
    {
      "id": "order-uuid-1",
      "externalOrderId": "shopify_10203",
      "status": "SHIPPED",
      "totalAmount": 49.99,
      "createdAt": "2026-06-30T10:15:00.000Z",
      "sellerId": "seller-uuid-1",
      "supplierId": "supplier-uuid-1",
      "storeUrl": "my-retail-store.myshopify.com"
    }
  ]
  ```

#### GET `/api/v1/orders/:id`
Retrieves detailed breakdown of order items.

- **Example Response**:
  ```json
  {
    "id": "order-uuid-1",
    "externalOrderId": "shopify_10203",
    "storeUrl": "my-retail-store.myshopify.com",
    "status": "SHIPPED",
    "totalAmount": 49.99,
    "carrier": "Royal Mail",
    "trackingCode": "GB123456789",
    "createdAt": "2026-06-30T10:15:00.000Z",
    "items": [
      {
        "id": "item-uuid-1",
        "sku": "ELEC-HEAD-001",
        "title": "Noise Cancelling Headphones",
        "quantity": 1,
        "price": 49.99
      }
    ]
  }
  ```

---

### 4. Reputation

#### GET `/api/v1/reputation/suppliers/:id`
Exposes the scorecards of a supplier's fulfillment history.

- **Example Response**:
  ```json
  {
    "id": "supplier-uuid-1",
    "companyName": "TechWholesale LTD",
    "reputationLevel": "ELITE",
    "onTimeDeliveryRate": 99.4,
    "reputationScore": 99.1,
    "fillRatePercentage": 98.2
  }
  ```

---

### 5. Analytics

#### GET `/api/v1/analytics/platform/current`
Exposes high-level platform-wide KPIs (gross merchandise value, refund rates, platform fees totals).

- **Example Response**:
  ```json
  {
    "windowStart": "2026-06-01T00:00:00.000Z",
    "windowEnd": "2026-06-30T23:59:59.000Z",
    "gmv": 128500.0,
    "netSales": 125300.0,
    "ordersTotal": 2400,
    "refundRate": 2.49,
    "platformFeesTotal": 6425.0
  }
  ```
