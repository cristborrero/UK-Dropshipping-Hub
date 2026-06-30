# Getting Started with the Public API

This guide provides a quick walkthrough for external integrators (SaaS developers, retail agencies, and wholesalers) looking to integrate with the UK Dropshipping Hub.

---

## 1. Obtaining an API Key

Currently, API keys are provisioned manually by the system operator.
To request an API key:
1. Contact the support desk or your account manager.
2. Provide the name of your organization and the platform/tool you are building.
3. Once approved, the operator will generate a unique key for you.

API keys look like this: `ukdh_live_abcdef123456...`

Keep your API key secret and never expose it in client-side code (browsers, mobile apps).

---

## 2. Setting Up Authentication Headers

All API endpoints are hosted at:
`http://localhost:3000` (Local Development)

To make a request, send your key in the `x-api-key` header:

```bash
curl -X GET http://localhost:3000/api/v1/products \
  -H "x-api-key: your_api_key_here"
```

Alternatively, you can use the standard `Authorization` header with the `ApiKey` scheme:

```bash
curl -X GET http://localhost:3000/api/v1/products \
  -H "Authorization: ApiKey your_api_key_here"
```

---

## 3. Querying Sandbox Products

You can query the catalog with filters like `inStockOnly=true` and category labels:

```bash
curl -X GET "http://localhost:3000/api/v1/products?category=Electronics&inStockOnly=true" \
  -H "x-api-key: your_api_key_here"
```

---

## 4. Troubleshooting Errors

If your API key is invalid or missing, the API returns a `401 Unauthorized` status:

```json
{
  "message": "Invalid or inactive API key",
  "error": "Unauthorized",
  "statusCode": 401
}
```

If you exceed the rate limits (100 requests per minute), the API returns a `429 Too Many Requests` status:

```json
{
  "message": "Rate limit exceeded. Maximum 100 requests per minute.",
  "error": "Too Many Requests",
  "statusCode": 429
}
```
