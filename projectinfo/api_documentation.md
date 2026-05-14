# HiveSpace Backend API Documentation

This document outlines all the available API endpoints in the HiveSpace backend, detailing the required headers, path parameters, and request bodies needed to connect it with your frontend.

### General Headers
For most requests, the following headers are generally expected:
*   **`Content-Type`**: `application/json` (Required for all `POST` requests with a Body).
*   **`Authorization`**: `Bearer <your_jwt_token>` (Required for all protected endpoints. Exclude for `/api/auth/**`, `/api/health`, and `/error`).

---

## 1. Authentication (`UserController`)

### Register a User
*   **Method:** `POST`
*   **Endpoint:** `/api/auth/register`
*   **Headers:** `Content-Type: application/json`
*   **Body (`RegisterRequest`):**
    ```json
    {
      "email": "user@example.com",     // Required, valid email
      "username": "john_doe",          // Required, 3-50 characters
      "password": "securepassword123"  // Required, min 6 characters
    }
    ```
*   **cURL Example:**
    ```bash
    curl -X POST http://localhost:8080/api/auth/register \
      -H "Content-Type: application/json" \
      -d '{"email": "user@example.com", "username": "john_doe", "password": "securepassword123"}'
    ```

### Login a User
*   **Method:** `POST`
*   **Endpoint:** `/api/auth/login`
*   **Headers:** `Content-Type: application/json`
*   **Body (`LoginRequest`):**
    ```json
    {
      "email": "user@example.com", // Required, valid email
      "password": "yourpassword"   // Required
    }
    ```
*   **cURL Example:**
    ```bash
    curl -X POST http://localhost:8080/api/auth/login \
      -H "Content-Type: application/json" \
      -d '{"email": "user@example.com", "password": "yourpassword"}'
    ```

---

## 2. Health Check (`HealthController`)

### Check API Status
*   **Method:** `GET`
*   **Endpoint:** `/api/health`
*   **Headers:** None required.
*   **Response:**
    ```json
    {
      "status": "UP",
      "timestamp": "2026-03-30T10:15:30",
      "message": "HiveSpace Backend is running smoothly"
    }
    ```
*   **cURL Example:**
    ```bash
    curl -X GET http://localhost:8080/api/health
    ```

---

## 3. Tenants (`TenantController`)

### Create a Tenant
*   **Method:** `POST`
*   **Endpoint:** `/api/tenants`
*   **Headers:** `Content-Type: application/json`, `Authorization: Bearer <token>`
*   **Body (`TenantRequest`):**
    ```json
    {
      "name": "My Organization",       // Required
      "slug": "my-org",                // Required
      "plan": "FREE",                  // Optional (Default: FREE)
      "description": "Optional desc"   // Optional
    }
    ```
*   **Note**: The owner is automatically assigned based on the authenticated user's JWT token.
*   **cURL Example:**
    ```bash
    curl -X POST http://localhost:8080/api/tenants \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer <your_jwt_token>" \
      -d '{"name": "My Organization", "slug": "my-org", "plan": "FREE", "description": "Optional desc"}'
    ```

*   **Response (`TenantResponse`):**
    ```json
    {
      "id": "123e4567-e89b-12d3...",
      "name": "My Organization",
      "slug": "my-org",
      "ownerEmail": "owner@email.com",
      "plan": "FREE",
      "active": true,
      "membersCount": 1,
      "workspacesCount": 0
    }
    ```

### Get Organizations by User ID
*   **Method:** `GET`
*   **Endpoint:** `/api/tenants/u/{userId}`
*   **Path Variables:**
    *   `userId` (UUID): The owner's User ID.
*   **Headers:** `Authorization: Bearer <token>`
*   **Requirement**: The `userId` must match the authenticated user's ID.
*   **Response:**
    ```json
    [
      {
        "id": "123e4567-e89b-12d3...",
        "name": "My Organization",
        "slug": "my-org",
        "ownerEmail": "owner@email.com",
        "plan": "FREE",
        "active": true,
        "membersCount": 1,
        "workspacesCount": 0
      }
    ]
    ```
*   **cURL Example:**
    ```bash
    curl -X GET http://localhost:8080/api/tenants/u/550e8400-e29b-41d4-a716-446655440000 \
      -H "Authorization: Bearer <your_jwt_token>"
    ```

### Get Tenant Count by User ID
*   **Method:** `GET`
*   **Endpoint:** `/api/tenants/count/{userId}`
*   **Path Variables:**
    *   `userId` (UUID): The owner's User ID.
*   **Headers:** `Authorization: Bearer <token>`
*   **Requirement**: The `userId` must match the authenticated user's ID.
*   **cURL Example:**
    ```bash
    curl -X GET http://localhost:8080/api/tenants/count/550e8400-e29b-41d4-a716-446655440000 \
      -H "Authorization: Bearer <your_jwt_token>"
    ```

---

## 4. Workspaces (`WorkSpaceController`)

### Create a Workspace
*   **Method:** `POST`
*   **Endpoint:** `/api/workspaces`
*   **Headers:** `Content-Type: application/json`, `Authorization: Bearer <token>`
*   **Body (`WorkspaceRequest`):**
    ```json
    {
      "name": "Development Workspace",       // Required
      "description": "Optional description", // Optional
      "plan": "BASIC",                       // Required
      "tenantId": "123e4567-e89b-12d3..."    // Required, UUID of the Tenant
    }
    ```
*   **cURL Example:**
    ```bash
    curl -X POST http://localhost:8080/api/workspaces \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer <your_jwt_token>" \
      -d '{"name": "Development Workspace", "description": "Optional description", "plan": "BASIC", "tenantId": "123e4567-e89b-12d3..."}'
    ```

### Get Workspaces by Tenant
*   **Method:** `GET`
*   **Endpoint:** `/api/workspaces/t/{tenantId}`
*   **Path Variables:**
    *   `tenantId` (UUID): The ID of the Tenant.
*   **Headers:** `Authorization: Bearer <token>`
*   **cURL Example:**
    ```bash
    curl -X GET http://localhost:8080/api/workspaces/t/{tenantId} \
      -H "Authorization: Bearer <your_jwt_token>"
    ```

---

## 5. Projects (`ProjectController`)
prc
### Create a Project
*   **Method:** `POST`
*   **Endpoint:** `/api/workspaces/{workspaceId}/projects`
*   **Path Variables:**
    *   `workspaceId` (UUID): The ID of the Workspace.
*   **Headers:** `Content-Type: application/json`, `Authorization: Bearer <token>`
*   **Body (`ProjectRequest`):**
    ```json
    {
      "name": "New Project",                  // Required
      "description": "Project description",   // Optional
      "status": "ACTIVE",                     // Required
      "workspaceId": "123e4567-e89b-12d3..."  // Required, UUID
    }
    ```
*   **cURL Example:**
    ```bash
    curl -X POST http://localhost:8080/api/workspaces/{workspaceId}/projects \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer <your_jwt_token>" \
      -d '{"name": "New Project", "description": "Project description", "status": "ACTIVE", "workspaceId": "123e4567-e89b-12d3..."}'
    ```

### Get Projects by Workspace
*   **Method:** `GET`
*   **Endpoint:** `/api/workspaces/{workspaceId}/projects`
*   **Path Variables:**
    *   `workspaceId` (UUID): The ID of the Workspace.
*   **Headers:** `Authorization: Bearer <token>`
*   **cURL Example:**
    ```bash
    curl -X GET http://localhost:8080/api/workspaces/{workspaceId}/projects \
      -H "Authorization: Bearer <your_jwt_token>"
    ```

---

## 6. Profiles (`ProfileController`)

### Get Current User Profile
*   **Method:** `GET`
*   **Endpoint:** `/api/profile`
*   **Headers:** `Authorization: Bearer <token>`
*   **Description:** Returns the profile of the currently authenticated user.
*   **Response:**
    ```json
    {
      "id": "123e4567-e89b-12d3...",
      "email": "user@example.com",
      "username": "john_doe",
      "role": "USER",
      "token": null
    }
    ```
*   **cURL Example:**
    ```bash
    curl -X GET http://localhost:8080/api/profile \
      -H "Authorization: Bearer <your_jwt_token>"
    ```
---

## 7. Teams (`TeamController`)

### Create a Team
*   **Method:** `POST`
*   **Endpoint:** `/api/p/{projectId}/teams`
*   **Path Variables:**
    *   `projectId` (UUID): The ID of the Project.
*   **Headers:** `Content-Type: application/json`, `Authorization: Bearer <token>`
*   **Body (`TeamRequest`):**
    ```json
    {
      "name": "Backend Team",           // Required
      "description": "API & DB work"    // Optional
    }
    ```
*   **cURL Example:**
    ```bash
    curl -X POST http://localhost:8080/api/p/{projectId}/teams \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer <your_jwt_token>" \
      -d '{"name": "Backend Team", "description": "API & DB work"}'
    ```

### Get Teams by Project
*   **Method:** `GET`
*   **Endpoint:** `/api/p/{projectId}/teams`
*   **Path Variables:**
    *   `projectId` (UUID): The ID of the Project.
*   **Headers:** `Authorization: Bearer <token>`
*   **cURL Example:**
    ```bash
    curl -X GET http://localhost:8080/api/p/{projectId}/teams \
      -H "Authorization: Bearer <your_jwt_token>"
    ```
---

## 8. Invitations (`InvitationController`)

### Generate an Invite
*   **Method:** `POST`
*   **Endpoint:** `/api/i/generate`
*   **Headers:** `Content-Type: application/json`, `Authorization: Bearer <token>`
*   **Requirement**: Authenticated user must be a `MANAGER` or `OWNER` of the target workspace.
*   **Body (`InviteRequest`):**
    ```json
    {
      "teamId": "123e4567-e89b-12d3...",
      "recipientUsername": "john_guest"
    }
    ```
*   **Response (`InviteResponse`):**
    ```json
    {
      "code": "INV-ABCD-1234",
      "teamName": "Backend Team",
      "recipientUsername": "john_guest",
      "expiresAt": "2026-04-09T18:30:00"
    }
    ```

### Join a Team (Accept Invite)
*   **Method:** `POST`
*   **Endpoint:** `/api/i/join`
*   **Headers:** `Content-Type: application/json`, `Authorization: Bearer <token>`
*   **Requirement**: Authenticated user's `username` must match the `recipientUsername` in the invite.
*   **Body (`JoinRequest`):**
    ```json
    {
      "inviteCode": "INV-ABCD-1234"
    }
    ```
