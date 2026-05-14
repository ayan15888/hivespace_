# HiveSpace — Backend API Reference

This document provides a complete guide to all available API endpoints in the HiveSpace backend. It is designed to assist the frontend in connecting to the core services.

## Base URL
The backend is configured to run at: `http://localhost:8080` (unless otherwise specified in `application.properties`).

---

## 1. Authentication (`/api/auth`)

### Register
Create a new user account.
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "username": "john_doe",
    "password": "securepassword123"
  }
  ```
- **Response**: `UserResponse` (includes `token`)

### Login
Authenticate and receive a JWT token.
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "yourpassword"
  }
  ```
- **Response**: `UserResponse` (includes `token`)

---

## 2. Organizations / Tenants (`/api/tenants`)
All entities in HiveSpace belong to a "Tenant" (Organization).

### Create Organization
- **Method**: `POST`
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "name": "Acme Corp",
    "slug": "acme-corp",
    "plan": "FREE",  // Optional
    "description": "Short description" // Optional
  }
  ```

### Get Organizations by User
Get all organizations owned/managed by a specific user.
- **Method**: `GET /u/{userId}`
- **Headers**: `Authorization: Bearer <token>`

---

## 3. Workspaces (`/api/workspaces`)

### Create Workspace
- **Method**: `POST`
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "name": "Design Team",
    "description": "Optional description",
    "plan": "BASIC",
    "tenantId": "UUID"
  }
  ```

### Get Workspaces by Organization
- **Method**: `GET /t/{tenantId}`
- **Headers**: `Authorization: Bearer <token>`

---

## 4. Projects (`/api/workspaces/{workspaceId}/projects`)

### Create Project
- **Method**: `POST`
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "name": "Website redesign",
    "description": "Project goals",
    "status": "ACTIVE",
    "workspaceId": "UUID"
  }
  ```

### Get Projects
- **Method**: `GET`
- **Headers**: `Authorization: Bearer <token>`

---

## 5. Teams & Invitations (`/api/i/**`)

### Generate Invite
- **Method**: `POST /api/i/generate`
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ "teamId": "UUID", "recipientUsername": "john_doe" }`

### Join Team
- **Method**: `POST /api/i/join`
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ "inviteCode": "INV-1234" }`

---

## 6. Profile (`/api/profile`)

### Get Current User
Returns details about the currently logged-in user.
- **Method**: `GET`
- **Headers**: `Authorization: Bearer <token>`
- **Response**:
  ```json
  {
    "id": "UUID",
    "email": "user@example.com",
    "username": "john_doe",
    "role": "USER"
  }
  ```

---

## 7. Health Check (`/api/health`)
Verify the backend status.
- **Method**: `GET`
- **No Headers required.**

---

## General Integration Tips
1. **Authorization**: Always include the `Authorization` header as `Bearer <JWT_TOKEN>` for protected routes.
2. **Error Handling**: The backend uses standard HTTP status codes (400 for bad requests, 401 for unauthorized, 403 for forbidden, etc.).
3. **Mock Data**: Until the backend is fully deployed, you can use the structure in this reference to mock your frontend services.
