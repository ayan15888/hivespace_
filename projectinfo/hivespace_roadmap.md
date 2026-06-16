# Hivespace Full Build Roadmap

## Before Writing a Single Line of Code

Spend one week here. This is not wasted time --- it prevents rebuilding
things three times.

Set up your monorepo structure first:

    hivespace/
      apps/
        web/
        api/
      packages/
        shared-types/
      docs/
      docker-compose.yml

Ensure one-command local setup using Docker Compose.

Set up GitHub Actions for CI from day one.

------------------------------------------------------------------------

## Phase 1 --- Identity & Structure (Weeks 1--4)

### Week 1 --- Auth

-   Supabase Auth (email/password)
-   JWT validation in Spring Boot
-   Next.js auth flow

### Week 2 --- Org & Workspace CRUD

-   Models: Organization, Workspace, Project, Team
-   Implement RLS policies early
-   Service layer architecture

### Week 3 --- Invite System

-   Token-based invites
-   Email via Resend
-   Handle edge cases

### Week 4 --- Roles & Permissions

-   PermissionResolver service
-   Unit tests for access control

------------------------------------------------------------------------

## Phase 2 --- Task Management (Weeks 5--8)

### Week 5 --- Task API

-   Task schema & CRUD
-   Cursor-based pagination

### Week 6 --- Kanban UI

-   Drag-and-drop board
-   Minimal card design

### Week 7 --- Task Detail

-   Editable fields
-   Activity timeline

### Week 8 --- Sprint & Backlog

-   Sprint planning
-   Basic analytics

------------------------------------------------------------------------

## Phase 3 --- GitHub Integration (Weeks 9--11)

### Week 9 --- OAuth & Repo Linking

### Week 10 --- Webhooks

### Week 11 --- Sync & Issue Linking

------------------------------------------------------------------------

## Phase 4 --- Real-time Chat (Weeks 12--15)

### Week 12 --- WebSocket Setup

### Week 13 --- Messaging

### Week 14 --- Threads & DMs

### Week 15 --- Notifications

------------------------------------------------------------------------

## Phase 5 --- Docs & Knowledge Base (Weeks 16--20)

### Week 16 --- Editor Setup

### Week 17 --- Block Types

### Week 18 --- Nested Pages

### Week 19 --- Graph View

### Week 20 --- Version History

------------------------------------------------------------------------

## Phase 6 --- Sharing & Email (Weeks 21--23)

### Week 21 --- Public Links

### Week 22 --- Email System

### Week 23 --- Gmail Integration

------------------------------------------------------------------------

## Phase 7 --- Billing (Weeks 24--25)

### Week 24 --- Stripe Setup

### Week 25 --- Feature Gating

------------------------------------------------------------------------

## Phase 8 --- AI Features (Weeks 26--30)

### Week 26 --- AI Assistant

### Week 27 --- Task Generation

### Week 28 --- PR Review AI

### Week 29 --- Semantic Search

### Week 30 --- Retrospective

------------------------------------------------------------------------

## Phase 9 --- Performance & Launch (Weeks 31--33)

### Week 31 --- Storage Migration

### Week 32 --- Performance Optimization

### Week 33 --- Launch Prep

------------------------------------------------------------------------

## Desktop App (Weeks 34--36)

-   Electron setup
-   WebGL support
-   Native OS features
-   Offline support
