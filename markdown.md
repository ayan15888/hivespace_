HIVESPACE
Project Blueprint & Architecture Document
All-in-one Project Management, Team Communication & Knowledge Base
Jira + Slack + Notion — Combined
FrontendNext.js + Tailwind + ShadCN	BackendSpring Boot
DatabaseSupabase (PostgreSQL)	Cache / QueueUpstash Redis
Version 1.0 | 2025
1. Product Overview
Hivespace is an all-in-one team collaboration and project management platform designed to eliminate tool sprawl. It combines the project tracking power of Jira, the real-time communication of Slack, and the knowledge management capabilities of Notion into a single unified workspace. It also features bidirectional GitHub integration for engineering teams and AI-powered features for productivity.
1.1 Core Modules
Project & Task Management — Kanban boards, sprint planning, backlog, milestones, GitHub-linked issues
Team Communication — Channels, threads, DMs, mentions, unified notification inbox
Docs & Knowledge Base — Rich-text documents, nested pages, graph-style linking, version history
GitHub Integration — Bidirectional sync of issues, PRs, commits, and assignments
AI Features — Task generation, smart triage, PR review, semantic search, retrospectives
Email Integration — Read and send official work email (Gmail/Outlook) inside Hivespace
Stakeholder Sharing — Public progress links with expiry for clients and investors
1.2 Data Hierarchy
The platform is structured as a clean four-level hierarchy:
Level	Description
Organization	The top-level entity. Represents the company. All employees belong here first.
Workspace	A division or department within the org. An employee can belong to multiple workspaces.
Project	A specific initiative within a workspace. Has its own board, docs, and channels.
Team	A group of people who work together. Scoped to a workspace. Multi-team membership allowed.
2. Tech Stack
2.1 Frontend
Framework: Next.js (App Router)
Styling: Tailwind CSS with ShadCN UI components
Rich Text Editor: Tiptap (ProseMirror-based) for the Docs module
Real-time Graph View: React Flow for the knowledge graph node-and-edge view
Charts & Analytics: Recharts
WebSocket client: STOMP over SockJS for real-time chat
2.2 Backend
Framework: Spring Boot (Java)
REST API + WebSocket: Spring MVC + Spring WebSocket (STOMP broker)
Authentication: JWT validation against Supabase JWKS endpoint
Async processing: Spring @Async with thread pool for webhook handling
Scheduled jobs: Spring @Scheduled for cleanup tasks and storage enforcement
File uploads: AWS SDK for Java pointed at Cloudflare R2 endpoint
2.3 Database & Infrastructure
Service	Purpose
Supabase (PostgreSQL)	Primary database, Row-Level Security, Auth, Realtime, File metadata
Supabase Auth	User authentication, OAuth2 provider integration
Supabase Realtime	Fallback real-time updates via Postgres logical replication
Upstash Redis	Invite token TTL storage, rate limiting, plan caching, Redis Streams queue
Cloudflare R2	Primary file storage — 10GB free, zero egress fees, S3-compatible API
Dodo	Subscription billing, seat management, invoice generation
Resend / Brevo	Transactional email (invites, notifications)
Gemini / Groq API	LLM calls for AI features — free tier viable at startup scale
3. Organisation & Permission Model
3.1 Role Hierarchy
Roles in Hivespace are context-scoped, not user-typed. The same person can be a Lead in one team and a Member in another. Permissions are enforced by a central PlanGuard and PermissionResolver service in Spring Boot.
Role	Scope & Permissions
Org Owner	Created automatically for the org creator. Cannot be removed. Full org control. Can promote/demote Org Admins.
Org Admin	Promoted by the Owner. Same operational access as Owner — manages employee list, invites, org settings.
Billing Admin	Narrow role — can only access the Stripe billing portal. Cannot see projects, tasks, or team data.
Workspace Admin	Manages workspace settings and adds existing org members to the workspace.
Team Lead	Manages team membership, task assignments, and team-level goals within their team scope.
Project Lead	Manages project board, milestones, stakeholder links, and project access.
Member	Standard access — can be assigned tasks, participate in channels, edit docs per project permissions.
Viewer	Read-only access to assigned workspaces or projects.
3.2 Invite Rules
Only Org Owners and Org Admins can bring net-new people into the system. Below that level, leads and admins only redistribute existing org members into their own scope.
Org Admin invites external email → new user joins org
Workspace Admin adds existing org member → joins workspace
Team Lead adds existing workspace member → joins team
Project Lead adds existing workspace member → joins project
3.3 Multi-Workspace & Multi-Team
Employees can belong to multiple workspaces and multiple teams simultaneously. There is no restriction. A user's org-level role acts as the ceiling — workspace and team roles cannot exceed it. Notifications across all workspaces are aggregated into a single unified inbox to prevent notification noise.
4. Invite System
4.1 Database Schema
Core tables powering the invite flow:
Table	Key Fields
invites	id, token (hashed), org_id, workspace_id?, team_id?, invited_email, invited_by, role, status (pending/accepted/expired/revoked), expires_at
memberships	id, user_id, org_id, workspace_id?, team_id?, role, joined_at
4.2 Invite Flow
Step 1 — Admin sends invite: Backend generates a cryptographically random token via SecureRandom, stores its SHA-256 hash in the invites table with status 'pending' and expiry of 72 hours, then sends the raw token in the invite email URL.
Step 2 — Invitee clicks link: Next.js frontend calls GET /api/invites/validate?token=... Spring Boot hashes the token, queries the DB, validates it is pending and not expired, returns org name and role for the welcome screen.
Step 3 — Account handling: New user registers first, then the pending invite for their email is auto-accepted. Existing user logs in and calls POST /api/invites/accept. Backend creates the membership record and marks the invite as accepted.
Step 4 — Edge cases handled:
Expired token: Show error + 'Request a new invite' button
Already accepted: Redirect to app with 'Already a member' message
Duplicate invite: Detect existing pending invite, resend same email
Email mismatch: Block — tokens are email-bound
Default channel: On membership creation, auto-add user to org's #general channel
5. Chat System
5.1 Database Schema
Table	Key Fields
channels	id, workspace_id, name, type (public/private/dm/thread), created_by
channel_members	channel_id, user_id, last_read_at (for unread counts)
messages	id, channel_id, sender_id, content, type, parent_id (threads), edited_at, deleted_at
message_reactions	message_id, user_id, emoji
5.2 Real-time Architecture
Two layers work together — WebSocket for live delivery, REST for reliability and history.
WebSocket layer: Spring Boot runs STOMP WebSocket server. Users subscribe to /user/queue/messages and /topic/channel.{id}
Message sending: POST /api/messages via REST (guarantees delivery confirmation), then broadcast via STOMP
Supabase Realtime: Fallback for unstable connections — listens to messages table via Postgres logical replication
Typing indicators: Pure ephemeral WebSocket signaling — never touches the database, auto-expires after 3 seconds
Optimistic UI: Frontend appends message before API confirmation, reconciles after
5.3 Key Features
Unread counts: Tracked via last_read_at in channel_members, cached in Upstash Redis with short TTL
Threads: Messages with parent_id set. Thread replies broadcast on separate /topic/thread.{parentId} topic
Message pagination: Cursor-based — last 50 messages on open, scroll up fetches older via before={messageId}
Push notifications: Enqueued asynchronously via Upstash Redis so they don't block message delivery
6. Task Management
6.1 Single & Multi-Assignee Tasks
Tasks support both individual ownership and collaborative assignment. Every task has one primary owner (shown on the Kanban card) and can have additional collaborators and reviewers.
Role on Task	Description
Owner	Primary accountable person. Shown prominently on board card. Required.
Collaborator	Contributing but not the primary owner. Notified on all updates.
Reviewer	Must approve or sign off the output. Similar to a GitHub PR reviewer.
6.2 Task Features
Kanban board with custom columns and sprint support
Single-person tasks supported — not every task needs a team
GitHub issue linking — bidirectional sync with commits, PRs
Custom fields, priority labels, due dates, milestones
Task timeline showing linked commits, PR status, comments
Automation rules — e.g. close task when linked PR is merged
7. GitHub Integration
7.1 Connection Setup
An Org Admin connects GitHub via OAuth App flow. Hivespace receives an access token stored encrypted in the database. Specific GitHub repositories are then linked to specific Hivespace projects.
Table	Key Fields
github_connections	org_id, github_org_name, access_token (encrypted), webhook_secret, connected_by
github_repo_links	project_id, github_repo_full_name, linked_by
user_github_connections	user_id, github_username, github_user_id, access_token
github_sync_log	action, github_event_id, processed — prevents infinite sync loops
7.2 GitHub → Hivespace (Webhooks)
Spring Boot registers webhooks on linked repos. Webhook endpoint validates HMAC-SHA256 signature, returns 200 immediately, then enqueues payload to Upstash Redis Streams for async processing.
GitHub Event	Hivespace Action
Push (commit)	Scan message for HS-123 references, link commit to task, add timeline entry
PR opened	Create linked PR record, show PR indicator on board card
PR merged	Auto-close linked task if automation rule is set
PR review submitted	Add timeline entry showing reviewer and approval status
Issue opened	Optionally create corresponding Hivespace task (toggle per repo)
Issue closed	Mark linked Hivespace task as Done
7.3 Hivespace → GitHub (API Calls)
Create GitHub issue from Hivespace task — calls POST /repos/{owner}/{repo}/issues
Assign GitHub issue — when task is assigned, sync assignee via GitHub API (requires user GitHub mapping)
Close GitHub issue — when task marked Done, calls GitHub API to close
Comment sync — comments marked 'sync to GitHub' posted to linked issue
7.4 Infinite Loop Prevention
Actions Hivespace takes on GitHub are logged in github_sync_log with the expected incoming webhook event ID. When that webhook arrives, the processor checks the log and skips processing if Hivespace triggered it.
8. Docs & Knowledge Base
8.1 Editor
The editor is built on Tiptap (ProseMirror-based React editor). Content is stored as ProseMirror JSON in Supabase. A flattened text_content column is maintained for Postgres full-text search.
8.2 Database Schema
Table	Key Fields
documents	id, workspace_id, project_id?, team_id?, title, parent_id (nested pages), icon, is_published, created_by
document_content	document_id, content (JSONB ProseMirror), text_content (plain text for search), version
document_versions	document_id, content (JSONB), saved_by, created_at — keep last 50 versions
document_links	source_doc_id, target_doc_id — powers graph view and backlinks
document_chunks	document_id, content, embedding (VECTOR 1536), chunk_index, heading — for AI search
8.3 Block Types Supported
Paragraph, Heading H1/H2/H3, Bullet list, Numbered list, Checklist
Code block with syntax highlighting, Blockquote, Divider, Image upload
Table, Inline task embed ([[task-123]] shows live task card)
Page linking — [[page name]] creates a bidirectional link recorded in document_links
8.4 Knowledge Graph
The [[page name]] inline link syntax creates edges in document_links. React Flow renders these as an interactive node-and-edge graph. Nodes are sized by connection count — heavily referenced docs become hub nodes. Backlinks appear at the bottom of every document. This feature differentiates Hivespace from Notion, Linear, and Jira which all lack a graph view.
8.5 Nested Pages
The parent_id field enables Notion-style nested page trees. A recursive CTE query in Postgres builds the full tree for the sidebar in one efficient query. Documents can be scoped to the workspace level, a specific project, or a team.
8.6 Version History
Auto-save triggers every 30 seconds or on significant change, inserting a row into document_versions. The last 50 versions are retained. Users can preview any past version and restore it with one click.
9. Stakeholder Progress Sharing
Project Leads can generate a public shareable link that shows a read-only progress dashboard to clients, investors, or external stakeholders — no login required.
9.1 Database Schema
Field	Description
token	Secure random token in the URL
scope (JSONB)	Controls what is visible — tasks, milestones, docs
password_hash	Optional bcrypt password protection
expires_at	Configurable — 7 days, 30 days, custom, or never
access_count / last_accessed_at	Shows the project lead whether the stakeholder viewed it
is_active	Toggle to instantly revoke the link
9.2 What the Public View Shows
Project name and description
Milestone progress (e.g. Sprint 3 of 5 — 68% complete)
Task breakdown by status as a visual chart
Docs explicitly marked as share-with-stakeholders by the Project Lead
Last updated timestamp
Internal comments, team discussions, private docs, and sensitive assignee details are never exposed. The endpoint is heavily rate-limited via Upstash Redis to prevent scraping.
10. Email Integration
10.1 Two Levels of Email Support
Type	Description
Notification emails (V1)	Hivespace sends emails about platform events — task assigned, mentioned, invite, sprint updates. Uses Resend (3,000/month free). Simple and included from day one.
Work email client (V2)	Employee reads and sends their actual work email (john@acmecorp.com) inside Hivespace. Connect via Gmail API or Microsoft Graph API OAuth.
Shared team inbox (V2)	Emails to support@company.com or hello@company.com routed via Cloudflare Email Routing (free) to Spring Boot webhook, creating collaborative threads in Hivespace.
10.2 Work Email Client Flow
Employee connects work email via OAuth in profile settings
Spring Boot stores encrypted OAuth tokens, fetches inbox via Gmail/Graph API
Inbox displayed in dedicated Email section in Hivespace sidebar
Compose and reply use the same API — recipient sees email from john@acmecorp.com
Email-to-task conversion — one click turns a client email thread into a Hivespace task
OAuth token refresh handled silently in the background
Gmail API and Microsoft Graph API have no per-call cost — only OAuth credentials from Google Cloud Console and Azure are required. Compute cost is absorbed by the existing Spring Boot instance.
11. AI Features
11.1 Feature List
AI Feature	Description
AI Assistant	/ai command in any channel or task. Summarizes threads, drafts replies, answers project questions.
Task Generation	Paste a feature spec or Slack message — AI breaks it into structured subtasks with suggested priority and assignee.
Smart Triage	New issues auto-classified by type (bug/feature/chore), priority suggested from keywords and history, assignee recommended from past ownership.
PR Code Review Assistant	When a PR opens, AI generates a change summary and flags potential issues, posted as a Hivespace comment.
Sprint Retrospective	At sprint close, AI summarizes completed work, blockers, and velocity trends into a shareable doc.
Semantic Search (RAG)	Search across tasks, docs, messages in natural language. Full-text baseline + PageIndex-style reasoning layer for quality.
11.2 Search Architecture
Two search layers work together. Postgres full-text search using tsvector on text_content provides fast keyword baseline. The reasoning-based RAG layer (PageIndex approach) generates structured summaries of each document on save, then at query time the LLM reasons over summaries to select the most relevant documents before synthesizing a final answer with source citations.
Chunking for AI search: Documents are split into ~500 token chunks, each stored in document_chunks with an embedding vector (VECTOR 1536 via pgvector in Supabase). Chunks reference their parent document and nearest heading so search results link back to the exact section.
Note: The exact RAG approach (PageIndex vs standard vector search vs hybrid) is to be confirmed with the team before implementation.
12. Subscription Model
12.1 Pricing Tiers
Plan	Price	Key Limits
Free	Free forever	5 members, 3 projects, 1 workspace, 1GB storage, no GitHub/AI
Pro	$8-12 / user / month	Unlimited members, GitHub, stakeholder links, email, basic AI, 50GB storage
Ultimate	$18-25 / user / month	Everything + advanced AI, semantic search, SSO, custom roles, 500GB storage
Enterprise	Custom pricing	Unlimited everything, dedicated support, SLA, on-premise option
12.2 Stripe Integration
Per-seat billing — Stripe subscription quantity = active member count
Automatic proration when members are added or removed mid-billing cycle
Annual billing at 20% discount (e.g. Pro = $96/year vs $120/year monthly)
14-day free Pro trial — no credit card required on signup
Payment failure: 7-day grace period with reminder emails before downgrading to Free
Stripe webhooks notify Spring Boot of payment events, trial endings, renewals
12.3 Feature Gating
All paid feature endpoints call a PlanGuard service in Spring Boot before executing. The org's current plan is cached in Upstash Redis with a 5-minute TTL. The Next.js frontend proactively disables and greys out locked features with an upgrade prompt rather than showing backend errors.
13. File Storage Architecture
13.1 Why Cloudflare R2
Supabase Storage's 1GB free limit is insufficient as the platform grows. Cloudflare R2 is the primary file store — 10GB free, $0.015/GB/month after, and zero egress fees. This dramatically reduces costs compared to AWS S3 or Google Cloud Storage which charge for every download.
13.2 Upload Flow
Files never pass through the Spring Boot backend. The backend generates a presigned R2 upload URL, the frontend uploads directly to R2 (bypassing the server entirely), and then notifies the backend of completion. The backend records metadata in Supabase and updates the org storage counter.
13.3 Storage Limits Per Plan
Plan	Storage Limit
Free	1GB per org
Pro	50GB per org
Ultimate	500GB per org
Enterprise	Custom / Unlimited
13.4 File Deletion
Soft deletes only — files marked is_deleted = true are retained in R2 for 30 days for accidental deletion recovery. A nightly Spring @Scheduled job permanently deletes files past the 30-day window and decrements the org storage counter. Sensitive files always served via short-lived presigned download URLs (15-minute expiry). Profile avatars and public assets served via Cloudflare CDN with long cache headers.
13.5 R2 Path Structure
Path Pattern	Content
orgs/{org_id}/workspaces/{ws_id}/projects/{proj_id}/tasks/{task_id}/attachments/	Task file attachments
orgs/{org_id}/workspaces/{ws_id}/projects/{proj_id}/docs/{doc_id}/images/	Document inline images
orgs/{org_id}/avatars/{user_id}.jpg	User profile pictures
orgs/{org_id}/exports/{export_id}.zip	Data exports
14. Free Resources & Cost Analysis
Hivespace can be built and run in early stages with near-zero infrastructure cost. The only reliable spend is Spring Boot hosting.
Service	Free Tier	Paid Trigger	Estimated Cost
Vercel (Frontend)	100GB bandwidth, unlimited deploys	Very high traffic	$0 to start
Spring Boot (Railway/Fly.io)	Limited — spins down	Day one for always-on	$5-10/month
Supabase	500MB DB, 1GB storage, 50k MAU	DB fills or MAU exceeded	$0 to start
Cloudflare R2	10GB storage, zero egress	Storage exceeds 10GB	$0.015/GB after
Upstash Redis	10k commands/day, 256MB	High command volume	$0 to start
Resend (Email)	3,000 emails/month	Email-heavy features	$0 to start
GitHub Integration	Webhooks and OAuth Apps free	Never	$0
Cloudflare Email Routing	Completely free	Never	$0
Gemini / Groq (AI)	1M tokens/day (Gemini Flash)	High AI usage volume	$0 to start
Stripe (Billing)	No monthly fee	Transaction % on revenue	Revenue-linked
KEY INSIGHT	The entire Hivespace stack can run for approximately $5-10/month during development and early users — purely the Spring Boot hosting cost. Every other service has a viable free tier for startup scale.		
---	---		
15. Recommended Build Order
Ship a focused, working product at each milestone rather than building everything in parallel.
Phase	What to Build
Phase 1 — Foundation	Auth (Supabase), Org/Workspace/Project/Team CRUD, Invite system, Membership & roles, Basic task board (Kanban), Notification emails
Phase 2 — GitHub	GitHub OAuth connection, Webhook ingestion (Upstash Redis Streams), Bidirectional issue sync, Commit & PR linking, User GitHub account mapping
Phase 3 — Communication	Channel CRUD, Real-time chat (STOMP WebSocket), Threads, DMs, Unread counts, Typing indicators, Unified inbox
Phase 4 — Knowledge Base	Tiptap editor, Nested pages, Document CRUD, Version history, Page linking + backlinks, Graph view (React Flow)
Phase 5 — Stakeholder & Email	Shareable progress links with expiry, Gmail OAuth integration, Email-to-task conversion, Shared team inbox via Cloudflare routing
Phase 6 — Subscription	Stripe integration, Plan tiers, Feature gating, Billing Admin role, Billing portal
Phase 7 — AI	Task generation, Smart triage, PR review assistant, Sprint retrospective, Semantic search (confirm RAG approach with team first)
RECOMMENDATION	Phases 1 and 2 deliver a working product for engineering teams immediately. Each phase after that adds a meaningful layer of value without blocking the core use case.
---	---
16. Open Decisions & Next Steps
Pending Team Decisions
RAG approach for AI search — PageIndex (reasoning-based, no vectors) vs standard pgvector embeddings vs hybrid. Team to align before Phase 7.
Real-time collaboration in Docs — last-write-wins auto-save (simpler, build first) vs Yjs CRDT multiplayer (complex, add later when needed).
Spring Boot hosting provider — Railway ($5/month), Fly.io (free tier then pay), or Render ($7/month always-on).
Email client priority — confirm whether Gmail/Outlook personal inbox integration is a V2 requirement or optional.
Mobile app — PWA via Next.js (free, good enough) or native iOS/Android (significant extra investment).
Architecture Decisions Already Made
Cloudflare R2 over Supabase Storage for file storage — confirmed
Upstash Redis Streams over BullMQ or RabbitMQ — confirmed
Tiptap over building a custom editor — confirmed
React Flow for knowledge graph view — confirmed
Per-seat Stripe billing model — confirmed
Multi-workspace and multi-team membership allowed — confirmed
Invite system: only Org Admins invite externally, others redistribute internally — confirmed
— End of Document —