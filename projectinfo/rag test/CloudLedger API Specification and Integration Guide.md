# CloudLedger API Specification and Integration Guide

**Project:** CloudLedger
**Version:** 1.0
**Prepared By:** FinOps Squad
**Related Documents:**

* Product Requirements Document v1.0
* Business Requirements Specification v1.0
* System Architecture Document v1.0

Last Updated: June 2026

---

# 1. Introduction

The CloudLedger API provides a REST-based interface that enables communication between the frontend application, backend services, and future third-party integrations. The API follows stateless design principles and relies on JWT-based authentication as defined in FR-001 of the Product Requirements Document. All endpoints return JSON responses and follow a common structure for success and error handling.

The API layer is implemented using FastAPI and acts as the primary interface to the business logic layer. Every request passes through authentication middleware, request validation, authorization checks, and database access components before generating a response. The architecture described in the System Architecture Document ensures that API operations remain modular and scalable as additional services are introduced in future releases.

---

# 2. Authentication and Authorization

Authentication is based on JSON Web Tokens. Users authenticate using their email address and password. Upon successful authentication, the Authentication Service generates an access token containing the user ID, organization ID, role, and expiration information. Passwords are hashed using bcrypt and are never stored in plain text.

Role-based access control is enforced throughout the system. Organization owners possess administrative privileges, finance managers have approval rights, employees may create expenses and invoices within permitted boundaries, and viewer accounts have read-only access. Authorization checks are performed after successful token validation and before business logic execution.

JWT tokens expire after eight hours and can be refreshed through the refresh token endpoint. Requests containing invalid or expired tokens receive HTTP 401 responses.

---

# 3. Standard Response Structure

Successful responses follow the structure:

```json
{
    "success": true,
    "data": {},
    "message": "Operation completed successfully"
}
```

Error responses follow the structure:

```json
{
    "success": false,
    "error_code": "RESOURCE_NOT_FOUND",
    "message": "Requested invoice does not exist"
}
```

This standardized response model simplifies frontend implementation and enables easier error handling across all modules.

---

# 4. Authentication APIs

## User Login

Endpoint:

POST /api/v1/auth/login

Description:

This endpoint validates user credentials and returns access and refresh tokens. Login events are recorded in the audit_logs table according to BR-006 defined in the Business Requirements Specification.

Request:

```json
{
    "email": "john@example.com",
    "password": "password123"
}
```

Response:

```json
{
    "success": true,
    "data": {
        "access_token": "jwt_token",
        "refresh_token": "refresh_token",
        "expires_in": 28800
    }
}
```

---

## Password Reset

POST /api/v1/auth/reset-password

The password reset endpoint sends a secure reset link to the registered email address. Tokens remain valid for thirty minutes. Reset requests are rate limited to prevent abuse.

---

# 5. Organization APIs

Organizations serve as logical containers for users and resources. According to BR-001, each user belongs to exactly one organization. Organization owners are responsible for inviting members and assigning roles.

## Create Organization

POST /api/v1/organizations

Request:

```json
{
    "name":"Acme Technologies",
    "industry":"Software"
}
```

Response:

```json
{
    "organization_id": 101
}
```

---

## Invite Member

POST /api/v1/organizations/invite

This endpoint sends invitation emails through the Notification Service. Invitations expire after 48 hours.

---

# 6. Invoice APIs

Invoice functionality implements FR-003 from the Product Requirements Document. Invoice records are stored in PostgreSQL and frequently accessed invoice summaries are cached using Redis.

## Create Invoice

POST /api/v1/invoices

Request:

```json
{
    "customer_name":"ABC Corporation",
    "amount":3500,
    "due_date":"2026-08-15"
}
```

Response:

```json
{
    "invoice_id":5001,
    "status":"Draft"
}
```

When an invoice is created, the system records an audit event and updates dashboard statistics asynchronously through Celery workers.

---

## Update Invoice Status

PATCH /api/v1/invoices/{id}

Business Rule:

Invoices marked as Paid cannot be deleted. This behavior is enforced according to BR-003 in the Business Requirements Specification.

Possible statuses:

* Draft
* Pending
* Paid
* Overdue
* Cancelled

---

## Search Invoices

GET /api/v1/invoices/search

Query Parameters:

* customer_name
* status
* amount
* date range

The search endpoint supports partial matching and multiple filters. Frequently used queries are cached in Redis for improved performance.

---

# 7. Expense APIs

Expense tracking implements FR-004. Receipt files are stored in object storage and metadata is maintained in PostgreSQL.

## Create Expense

POST /api/v1/expenses

Request:

```json
{
    "title":"Marketing Campaign",
    "amount":1200,
    "category":"Marketing"
}
```

Response:

```json
{
    "expense_id":3001,
    "status":"Pending Approval"
}
```

Expenses larger than predefined thresholds automatically generate approval requests for finance managers.

---

## Upload Receipt

POST /api/v1/expenses/upload

The upload service validates file size and type before storing files. According to BR-005, uploaded receipts cannot exceed 10 MB. Accepted formats include PDF, PNG, and JPEG.

Receipt metadata is linked to expense records and indexed for future retrieval.

---

# 8. Notification APIs

Notifications are delivered through email and in-app channels. The Notification Service runs as an independent component and uses background workers for asynchronous delivery.

Subscription reminders are generated seven days before renewal dates as defined in BR-007.

Supported events include:

* Invoice due reminders
* Team invitations
* Expense approvals
* Subscription renewals

---

# 9. Reporting APIs

Reporting endpoints aggregate invoice and expense data to provide financial insights.

GET /api/v1/reports/monthly

GET /api/v1/reports/annual

GET /api/v1/reports/revenue

GET /api/v1/reports/expenses

Report generation is delegated to Celery workers when datasets become large. Frequently requested reports are cached to minimize database load.

---

# 10. Rate Limiting

To prevent abuse and ensure platform stability, API requests are protected by rate limiting mechanisms.

Authentication endpoints:

10 requests per minute.

General endpoints:

100 requests per minute.

Report endpoints:

20 requests per minute.

Exceeding limits results in HTTP 429 responses.

---

# 11. Error Handling

Common errors include:

400 Bad Request

Occurs when request payload validation fails.

401 Unauthorized

Returned when JWT tokens are invalid or expired.

403 Forbidden

Generated when users attempt actions outside their role permissions.

404 Not Found

Returned when resources do not exist.

500 Internal Server Error

Indicates unexpected failures within backend services.

All errors are logged and monitored through centralized logging systems.

---

# 12. Future Integrations

The API layer has been designed to support future integrations without major architectural changes. Planned integrations include Stripe, PayPal, QuickBooks, Slack, and Google Drive. These integrations will utilize webhook mechanisms and OAuth-based authentication flows.

The modular design described in the System Architecture Document enables independent scaling of services and simplifies the addition of external providers. Background workers and event queues ensure that long-running operations do not block API responses and maintain the target latency requirement of less than 300 milliseconds defined in the Product Requirements Document.

---

END OF DOCUMENT
