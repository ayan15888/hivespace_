# System Architecture Document (SAD)

**Project:** CloudLedger
**Version:** 1.0
**Prepared By:** FinOps Squad
**Related Documents:**

* Product Requirements Document v1.0
* Business Requirements Specification v1.0

Last Updated: June 2026

---

# 1. Introduction

This document describes the technical architecture of CloudLedger. The system is designed as a modular web application that supports invoice management, expense tracking, subscription monitoring, reporting, and notifications.

The architecture supports the functional requirements defined in the Product Requirements Document and business rules defined in the Business Requirements Specification.

---

# 2. Architectural Goals

The platform should provide:

* Scalability
* High availability
* Security
* Low latency
* Easy maintainability
* Support for future integrations

Target uptime: 99.9%

---

# 3. System Overview

CloudLedger follows a three-tier architecture:

### Presentation Layer

Responsible for:

* User Interface
* Authentication pages
* Dashboard
* Invoice screens
* Reports

Technology:

* Next.js
* TypeScript
* Tailwind CSS

---

### Application Layer

Responsible for:

* Business logic
* Validation
* Authorization
* API endpoints
* Notifications

Technology:

* FastAPI
* Python

---

### Data Layer

Responsible for:

* Persistent storage
* Relationships
* Transactions

Technology:

* PostgreSQL

---

# 4. High-Level Architecture

Client Browser

↓

Next.js Frontend

↓

FastAPI Backend

↓

Redis Cache

↓

PostgreSQL Database

↓

Object Storage

↓

Background Workers

---

# 5. Frontend Components

### Authentication Module

Supports:

* Login
* Registration
* Password reset

Implements requirements:

* FR-001 User Authentication

---

### Dashboard Module

Displays:

* Revenue metrics
* Expenses
* Invoice statistics
* Subscription reminders

Implements:

* FR-006 Dashboard

---

### Invoice Module

Supports:

* Create invoice
* Edit invoice
* Mark paid
* PDF export

Implements:

* FR-003 Invoice Management

---

### Expense Module

Supports:

* Expense submission
* Receipt upload
* Expense categories

Implements:

* FR-004 Expense Tracking

---

### Subscription Module

Supports:

* Add subscription
* Renewal reminders

Implements:

* FR-005 Subscription Management

---

# 6. Backend Services

## Authentication Service

Responsibilities:

* Login
* JWT generation
* Password hashing
* Session validation

Security:

* bcrypt password hashing
* JWT expiration

Supports:

FR-001

---

## Organization Service

Responsibilities:

* Create organizations
* User invitations
* Role assignment

Business rules:

* BR-001
* BR-002

---

## Invoice Service

Responsibilities:

* Create invoices
* Update status
* Generate PDFs
* Search invoices

Business rules:

* BR-003

Supports:

FR-003

---

## Expense Service

Responsibilities:

* Upload receipts
* Store expenses
* Approve expenses

Business rules:

* BR-004
* BR-005

Supports:

FR-004

---

## Notification Service

Responsibilities:

* Email reminders
* In-app notifications

Business rules:

* BR-007

Supports:

FR-008

---

## Reporting Service

Responsibilities:

* Revenue reports
* Expense reports
* Annual summaries

Supports:

FR-007

---

# 7. Database Architecture

Database:

PostgreSQL

Primary tables:

## users

Columns:

* id
* email
* password_hash
* role
* organization_id

---

## organizations

Columns:

* id
* name
* industry

---

## invoices

Columns:

* id
* customer_name
* amount
* status
* due_date

Status values:

* Draft
* Pending
* Paid
* Overdue
* Cancelled

---

## expenses

Columns:

* id
* title
* amount
* category
* receipt_url

---

## subscriptions

Columns:

* id
* service_name
* amount
* billing_cycle
* next_billing_date

---

## audit_logs

Columns:

* id
* event_type
* user_id
* timestamp

Retention period:

365 days

Implements:

BR-006

---

# 8. Caching Layer

Technology:

Redis

Cached data:

* Dashboard statistics
* Invoice summaries
* Reports

Refresh interval:

5 minutes

Implements:

BR-008

---

# 9. File Storage

Stores:

* Expense receipts
* Invoice PDFs

Maximum upload size:

10 MB

Implements:

BR-005

Storage structure:

receipts/

invoices/

exports/

---

# 10. Background Workers

Responsibilities:

* Email delivery
* Report generation
* Subscription reminders
* Audit log cleanup

Technology:

Celery + Redis

---

# 11. Security Architecture

Authentication:

JWT

Password hashing:

bcrypt

Security measures:

* HTTPS only
* Input validation
* SQL injection prevention
* Role-based access control
* Request validation

Supports:

Non-functional security requirements

---

# 12. Notification Architecture

Channels:

### Email

Events:

* Invoice due
* Subscription renewal
* Team invitations

### In-App Notifications

Events:

* Expense approval
* Invoice updates

Implements:

FR-008

---

# 13. Monitoring

Metrics:

* CPU usage
* Memory utilization
* API latency
* Error rate

Target API latency:

<300 ms

---

# 14. Backup Strategy

Database backups:

Daily

Retention:

30 days

Object storage backups:

Weekly

Disaster recovery objective:

4 hours

Supports:

Reliability requirements

---

# 15. Scalability

Expected load:

Organizations:

10,000+

Invoices:

100,000+

Expense records:

1,000,000+

Concurrent users:

1000

---

# 16. External Dependencies

CloudLedger depends on:

* PostgreSQL
* Redis
* SMTP email provider
* Object storage service
* Celery worker system

---

# 17. Future Architecture Enhancements

Planned additions:

* Microservices architecture
* OCR service
* AI expense categorization
* Mobile API gateway
* Stripe integration
* QuickBooks integration
* Multi-currency support

---

END OF DOCUMENT
