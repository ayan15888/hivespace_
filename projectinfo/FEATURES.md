# HiveSpace: Comprehensive Features & Capabilities Guide

HiveSpace is an all-in-one team collaboration and project management platform designed to eliminate tool sprawl by combining the project tracking power of **Jira**, the real-time communication of **Slack**, and the knowledge management capabilities of **Notion** into a single, unified workspace, supercharged with **GitHub Integration** and **AI-powered agents**.

---

## 1. Core Data Hierarchy & Workspace Model

HiveSpace uses a clean four-level data and access hierarchy to organize work across organizations of any size:

*   **Organization:** The top-level corporate entity (e.g., the company). All employees, billing configuration, and global settings belong to the organization.
*   **Workspace:** Dedicated divisions, departments, or focus groups within an organization (e.g., *Engineering*, *Marketing*, *HR*). A user can belong to multiple workspaces simultaneously.
*   **Project:** A specific initiative, release, or tracking board within a workspace. Each project contains its own Kanban board, documentation, and chat channels.
*   **Team:** A group of people who work together, scoped to a workspace. Multi-team membership is fully supported.

---

## 2. Organization & Permission Model

HiveSpace enforces context-scoped, non-rigid permissions using a centralized `PlanGuard` and `PermissionResolver` system.

*   **Context-Scoped Roles:** A user's role is defined locally. A user can be a *Team Lead* in one team, a *Member* in a project, and a *Viewer* in another workspace.
*   **Roles Hierarchy:**
    *   **Org Owner:** Automatically assigned to the organization creator. Possesses full operational and billing control, with the unique ability to promote/demote Org Admins.
    *   **Org Admin:** Manages organization settings, employee lists, billing settings, and issues external invites.
    *   **Billing Admin:** Narrowly scoped access limited purely to subscription management and the Stripe billing portal.
    *   **Workspace Admin:** Manages workspace-specific settings and adds existing organization members to the workspace.
    *   **Team Lead:** Manages team membership, task assignments, and team goals.
    *   **Project Lead:** Controls the project board, sprints, milestones, stakeholder links, and project-specific access.
    *   **Member:** Standard read/write access. Can be assigned tasks, participate in chat channels, and edit documentation.
    *   **Viewer:** Read-only access to assigned workspaces or projects.
*   **Multi-Workspace & Multi-Team Integration:** Notifications across all workspaces are aggregated into a single unified dashboard/inbox to prevent context-switching fatigue.

---

## 3. Invite & Onboarding System

A secure, multi-tier invitation system ensures secure onboarding:

*   **External vs. Internal Invites:** Only Org Owners and Org Admins can invite net-new external users (via email). Workspace Admins, Team Leads, and Project Leads redistribute existing organization members into their respective scopes.
*   **Secure Token Flow:** Invitations generate a cryptographically random token (using `SecureRandom` on the backend). A SHA-256 hash of this token is stored in the database with a 72-hour TTL, and the raw token is sent to the invitee's email.
*   **Onboarding Automation:** Upon accepting an invite, the user is automatically added to the organization's default `#general` channel and routed through an onboarding wizard.

---

## 4. Real-Time Chat & Communication (Slack Alternative)

The chat system combines a WebSocket layer for instant updates with a REST API for message reliability and history.

*   **Channels:** Support for multiple channel types:
    *   **Public Channels:** Open to all workspace/project members.
    *   **Private Channels:** Restrictive access, visible only to invited members.
    *   **DMs (Direct Messages):** One-on-one or group private messaging.
    *   **Threads:** Contextual replies to specific messages to keep main channels clean.
*   **Typing Indicators:** Ephemeral WebSocket signals that bypass database writes and auto-expire after 3 seconds.
*   **Unread Indicators & Badging:** High-performance tracking via `last_read_at` states, optimized with short-TTL caching in Upstash Redis.
*   **Pagination & Message History:** Cursor-based pagination that fetches chunks of 50 messages as the user scrolls up.
*   **Message Reactions:** Rich emoji reaction support linked to each message.
*   **Optimistic UI updates:** Instantly appends sent messages to the user interface, reconciling with the backend confirmation asynchronously.

---

## 5. Task & Project Management (Jira / Linear Alternative)

HiveSpace offers robust task management built for modern engineering and product workflows.

*   **Kanban Boards:** Customizable columns representing different stages of a project's workflow.
*   **Sprint Planning & Backlogs:** Support for sprints, milestones, backlog prioritization, and due dates.
*   **Flexible Assignment Model:**
    *   **Owner (Single Assignee):** The primary accountable person, shown on the board card.
    *   **Collaborators (Multi-Assignee):** Team members contributing to the task, notified of all updates.
    *   **Reviewers:** Assigned to sign off on the task output (similar to code review).
*   **Task Timeline:** An audit trail tracking commit associations, PR status, comments, and field changes.
*   **Automation Rules:** Auto-close tasks when linked GitHub Pull Requests are merged.

---

## 6. Docs & Collaborative Knowledge Base (Notion Alternative)

A complete wiki and documentation system integrated directly alongside your tasks and communication.

*   **ProseMirror-Based Tiptap Editor:** A modern, rich-text WYSIWYG editor.
*   **Supported Block Types:** Headings, checklists, bullet lists, code blocks with syntax highlighting, dividers, image uploads, tables, and blockquotes.
*   **Page Embedding & Wiki Links:**
    *   **[[Page Name]] Linkage:** Instantly link documents together, generating bidirectional backlinks.
    *   **[[Task ID]] Embeds:** Embed a live, interactive task card directly inside a document.
*   **Nested Pages:** Notion-style tree view of documents, built efficiently using recursive PostgreSQL Common Table Expressions (CTEs).
*   **Version History:** Automatically saves drafts every 30 seconds or on major edits, keeping a history of the last 50 versions for one-click restores.

---

## 7. Knowledge Graph View

HiveSpace distinguishes itself from typical project management tools with a visual representation of team knowledge.

*   **Interactive Node-and-Edge Graph:** Rendered using React Flow, visualising how documents link together via `[[Page Name]]` references.
*   **Hub Nodes:** Nodes are sized dynamically based on their connection count, making high-value wiki hubs stand out.
*   **Backlinks Indexing:** A list of incoming links is appended to the bottom of every document for easy navigation.

---

## 8. Bidirectional GitHub Integration

Engineering teams can sync their developer workflow directly into their project boards.

*   **OAuth Connection & Repo Mapping:** Organization Admins connect GitHub accounts and map specific GitHub repositories to specific HiveSpace projects.
*   **GitHub to HiveSpace (Webhooks):**
    *   **Commit Scanning:** Commits containing task codes (e.g., `HS-123`) append themselves to the task timeline.
    *   **PR Indicators:** Opening a PR shows live PR status badges on the task board.
    *   **Auto-Close:** Merging a PR moves the linked task to "Done".
    *   **PR Review Logs:** Review submissions and approvals appear on the task timeline.
*   **HiveSpace to GitHub (API):**
    *   Create GitHub issues directly from HiveSpace tasks.
    *   Sync assignees and close issues from the HiveSpace interface.
    *   Post synced comments directly to GitHub.
*   **Infinite Loop Prevention:** Uses a synchronization log to track outgoing calls and prevent webhook echo loops.

---

## 9. Stakeholder Progress Sharing

Project leads can keep clients, investors, or external stakeholders updated without inviting them to the internal workspace.

*   **Secure Public Links:** Generates a read-only progress page containing:
    *   Milestone progress charts.
    *   Task breakdown diagrams.
    *   Selected documents explicitly marked as public by the project lead.
*   **Security Controls:** Links can be password-protected, set to expire (e.g., after 7, 30 days), or instantly revoked.
*   **Access Tracking:** Logs access count and last viewed timestamp to monitor stakeholder engagement.

---

## 10. Email Integration

HiveSpace features two levels of email communication:

*   **Notification Mailer:** Automated notifications for platform events (mentions, assignments, project updates) delivered via Resend.
*   **Work Email Client:** Employees can link personal work email (Gmail / Outlook OAuth) to view, compose, and reply to emails from a dedicated sidebar folder.
*   **Shared Team Inbox:** Routes inbound emails sent to alias addresses (e.g., `support@company.com`) into shared communication channels, allowing collaborative email triage.
*   **Email-to-Task Conversion:** One-click conversion turns any customer email thread into a tracked task card.

---

## 11. AI-Powered Features & Agents

HiveSpace is supercharged with native AI features powered by Gemini/Llama:

*   **AI Assistant (Hex AI):** A global conversational assistant that can chat with you, summarize channels, compile document briefs, and answer workspace-wide queries.
*   **Semantic Search (RAG):** Natural language search across all documents, chat messages, and tasks, utilizing a hybrid search (pgvector embeddings + keyword match).
*   **Smart Triage Agent:** Scans the active backlog to categorize issue types, suggest priorities, flag past due dates, and recommend assignees based on historical work.
*   **Sprint Retrospective Agent:** Aggregates completed work, velocity metrics, blockers, and chat logs to auto-generate a structured Markdown retrospective document.
*   **Task Generation from Brief:** Parses a pasted product requirement document or feature brief and automatically decomposes it into structured task cards.
*   **Duplicate Task Detector:** Uses vector embeddings to warn users if a task with a similar title/description already exists on the project board.
*   **PR Code Review Assistant:** Generates summary reviews of open PRs and flags potential code quality issues directly on the task board.

---

## 12. Subscription & Feature Gating

*   **Multi-Tier Plans:**
    *   *Free:* 5 members, 3 projects, 1 workspace, 1GB storage.
    *   *Pro:* Unlimited members, GitHub, stakeholder links, email client, basic AI, 50GB storage.
    *   *Ultimate:* Pro features + advanced AI, semantic search, SSO, custom roles, 500GB storage.
    *   *Enterprise:* Custom SLA, dedicated support, custom storage limits, on-premise deployments.
*   **Stripe Seat-Based Billing:** Automatically scales subscription seats based on active member count with mid-cycle proration.
*   **PlanGuard Interceptor:** Gates paid features on both frontend (UI components disabled with upgrade prompts) and backend (REST API interceptors).

---

## 13. File Storage Architecture

*   **Cloudflare R2 Integration:** Uses S3-compatible R2 storage for massive savings, featuring zero egress fees and a 10GB free tier.
*   **Direct-to-Storage Uploads:** Frontend requests presigned upload URLs from the backend, uploading files directly to R2. This keeps the backend server lightweight and fast.
*   **Soft Deletion:** Marks deleted files as `is_deleted = true` for 30 days before a scheduled cron job purges them permanently.
