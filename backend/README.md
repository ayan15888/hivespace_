# 🚀 HiveSpace – Multi-Tenant SaaS Backend

HiveSpace is a **production-style multi-tenant backend system** built using **Spring Boot**.  
It is designed to power modern SaaS applications where **multiple organizations (tenants)** collaborate using **projects, chat, mentions, and role-based access** — all while safely sharing a single backend.

This is **not a simple CRUD app**.  
HiveSpace models real-world SaaS platforms like **Slack, Notion, Jira, ClickUp**.

---

## 🌟 Key Highlights

- 🏢 True multi-tenancy (organization-level isolation)
- 👤 Owner, Admin, and Member roles
- 📁 Project-based collaboration
- 💬 Organization & project-level chat
- 👤 Mentions (`@username`) & notifications
- 📦 Subscription-ready architecture
- 🧠 Clean, scalable backend design

---

## 🏢 What Is a Tenant?

A **Tenant** represents a **company or organization** using the platform.

### Example Tenants

- **Google** → `hivespace.com/google`
- **StartupX** → `hivespace.com/startupx`

Each tenant has:

- Its **own users**
- Its **own projects**
- Its **own chats**
- **Completely isolated data**

This is **true SaaS multi-tenancy**.

---

## 🧩 Core Features

### 1️⃣ Workspace (Tenant) Management

- Create a workspace (organization)
- Unique workspace **name & slug**
- Assign **owner** during registration
- Enable / disable workspace

**Example:**
StartupX registers → Workspace created → Owner assigned


---

### 2️⃣ Clean URL-Based Workspace Access

Each workspace gets a human-readable URL:

hivespace.com/startupx


✔ Professional SaaS routing  
✔ Easy tenant resolution  

---

### 3️⃣ User & Role Management

- Users join workspaces
- Role-based access:
  - `OWNER`
  - `ADMIN`
  - `MEMBER`

✔ Secure permission handling  

---

### 4️⃣ Project Management

- Create projects inside a workspace
- Assign members to projects
- Project-specific access control

**Example:**
Workspace: StartupX
Project: Mobile App
Members: Rahul, Ayan


---

### 5️⃣ Organization-Level Chat

- One chat per workspace
- Company-wide communication

**Use cases:**
- Announcements
- General discussions

---

### 6️⃣ Project-Level Chat

- Separate chat for each project
- Only project members can access

✔ Focused collaboration  

---

### 7️⃣ Mentions System (`@username`)

- Tag users in messages
- Mentioned users receive notifications

**Example:**
@ayan please review the API changes


---

### 8️⃣ Notifications

Users receive notifications when:

- Mentioned in a chat
- Added to a project
- Workspace settings change

---

### 9️⃣ Subscription-Ready Design

- Plans:
  - `FREE`
  - `PRO`
  - `ENTERPRISE`
- Plan stored per tenant
- Feature gating ready for billing integration

---

## 🗺️ Entity Overview

Tenant
├── Users (TenantUser)
├── Projects
│ └── ProjectMembers
├── ChatRooms
│ └── Messages
│ └── Mentions
└── Subscription


---

## 🛠️ Tech Stack

### Backend
- Java 17
- Spring Boot
- Spring Data JPA
- Hibernate

### Database
- MySQL / PostgreSQL

### Tools
- Lombok
- Gradle
- Postman

---

## 🧠 Architecture

Client
↓
Controller Layer
↓
Service Layer
↓
Repository Layer
↓
Database


✔ Clean separation of concerns  
✔ Easy to scale & maintain  

---

## 🔐 Multi-Tenancy Strategy

- Single database
- Tenant ID used as data boundary
- Repository-level tenant filtering

✔ Secure isolation  
✔ Cost-effective  

---

## 🚀 Roadmap / Future Enhancements

- JWT authentication
- Real-time chat (WebSockets)
- Billing & payments
- Audit logs
- Analytics per tenant

---

## 🎯 Why This Project Stands Out

| Typical Project | HiveSpace |
|-----------------|----------|
| Single-user CRUD | Multi-tenant SaaS |
| No roles | Owner / Admin / Member |
| No collaboration | Chat + Mentions |
| Toy project | Production-style design |

---

## 📌 Summary

HiveSpace is a **real-world SaaS backend foundation**, designed to scale with organizations, users, and collaboration features — making it ideal for **enterprise-grade applications**.
