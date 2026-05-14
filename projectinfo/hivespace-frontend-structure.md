# HiveSpace — Frontend Folder Structure
> Next.js 16 · TypeScript · Tailwind · shadcn/ui · Zustand · Modular feature architecture

---

## Philosophy

| Layer | Rule |
|---|---|
| `app/` | Routing only — no logic, no store access, no API calls |
| `features/` | Self-contained modules — each feature owns its components, hooks, services, types |
| `store/` | Centralized Zustand — one folder, one subfolder per domain |
| `components/` | Shared UI only — used by 2+ features, no business logic |
| `lib/` | Stateless infrastructure — api client, socket factory, cookie helpers |
| `providers/` | React context wrappers — mounted once in root layout |

**Import direction (never go backwards):**
```
app/ → features/ → store/ → lib/
                 → components/
                 → constants/
```

---

## Full Structure

```
frontend/
│
├── middleware.ts                         # Route auth guard — runs on every request before render
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.mjs
├── tsconfig.json                         # Add paths alias: @/* → ./*
├── eslint.config.mjs
├── components.json                       # shadcn config
├── .env.local                            # NEXT_PUBLIC_API_URL, NEXT_PUBLIC_WS_URL
├── .env.production
│
├── app/                                  # Next.js App Router — routing shell only
│   │
│   ├── (marketing)/                      # Public pages — SSR, no auth, good for SEO
│   │   ├── layout.tsx                    # Marketing layout: Navbar + Footer
│   │   ├── page.tsx                      # Landing page /
│   │   └── pricing/
│   │       └── page.tsx
│   │
│   ├── (auth)/                           # Auth pages — redirect to /dashboard if already authed
│   │   ├── layout.tsx                    # Centered card layout, no sidebar
│   │   ├── login/
│   │   │   └── page.tsx                  # Imports LoginForm from features/auth
│   │   └── register/
│   │       └── page.tsx                  # Imports RegisterForm from features/auth
│   │
│   ├── (app)/                            # Protected pages — all share AppShell (sidebar + topbar)
│   │   ├── layout.tsx                    # Renders AppShell, checks auth via middleware
│   │   ├── dashboard/
│   │   │   └── page.tsx                  # /dashboard — workspace overview
│   │   ├── inbox/
│   │   │   └── page.tsx                  # /inbox — notification history
│   │   ├── my-tasks/
│   │   │   └── page.tsx                  # /my-tasks — tasks assigned to current user
│   │   └── [orgSlug]/                    # Dynamic org slug — e.g. /acme
│   │       ├── page.tsx                  # Org overview
│   │       ├── settings/
│   │       │   └── page.tsx
│   │       ├── members/
│   │       │   └── page.tsx
│   │       └── workspaces/
│   │           └── [workspaceId]/        # e.g. /acme/workspaces/abc-123
│   │               ├── page.tsx          # Workspace overview
│   │               └── projects/
│   │                   └── [projectId]/ # e.g. /acme/workspaces/abc/projects/xyz
│   │                       ├── page.tsx  # Kanban board (default view)
│   │                       ├── list/
│   │                       │   └── page.tsx
│   │                       └── sprint/
│   │                           └── page.tsx
│   │
│   ├── layout.tsx                        # Root layout — fonts, all providers
│   ├── globals.css
│   └── not-found.tsx
│
│
├── features/                             # One folder per product feature — fully self-contained
│   │
│   ├── auth/
│   │   ├── components/
│   │   │   ├── LoginForm.tsx
│   │   │   └── RegisterForm.tsx
│   │   ├── hooks/
│   │   │   └── useAuth.ts               # Reads authStore — only way components touch auth state
│   │   ├── services/
│   │   │   └── authService.ts           # POST /api/auth/login, /register
│   │   ├── types/
│   │   │   └── auth.types.ts            # User, LoginRequest, RegisterRequest, AuthResponse
│   │   └── index.ts                     # Public API — export only what other features need
│   │
│   ├── workspace/
│   │   ├── components/
│   │   │   ├── WorkspaceCard.tsx
│   │   │   ├── WorkspaceSwitcher.tsx
│   │   │   └── OrgOverview.tsx
│   │   ├── hooks/
│   │   │   └── useWorkspace.ts          # Active org/workspace/project context
│   │   ├── services/
│   │   │   ├── tenantService.ts         # POST /api/tenants, GET /api/tenants/{slug}
│   │   │   └── workspaceService.ts      # POST /api/workspaces, GET /api/workspaces/tenant/{id}
│   │   ├── types/
│   │   │   └── workspace.types.ts       # Tenant, Workspace, TenantRequest, WorkspaceRequest
│   │   └── index.ts
│   │
│   ├── kanban/
│   │   ├── components/
│   │   │   ├── KanbanBoard.tsx          # Orchestrator — renders columns, wires drag context
│   │   │   ├── KanbanColumn.tsx         # Single status column — title, task list, add button
│   │   │   ├── TaskCard.tsx             # Single task — priority, title, labels, assignee
│   │   │   ├── TaskDetailModal.tsx      # Full task view — description, comments, meta
│   │   │   └── TaskCreateForm.tsx       # New task form
│   │   ├── hooks/
│   │   │   ├── useTasks.ts             # Fetches tasks, hydrates taskStore
│   │   │   └── useDragDrop.ts          # All drag logic isolated — calls taskStore.moveTask()
│   │   ├── services/
│   │   │   ├── taskService.ts           # CRUD for tasks
│   │   │   └── projectService.ts        # GET/POST /api/{slug}/workspaces/{id}/projects
│   │   ├── types/
│   │   │   └── task.types.ts            # Task, TaskStatus, Priority, Label, TaskAssignment
│   │   └── index.ts
│   │
│   ├── chat/                            # Phase 2 — WebSocket messaging
│   │   ├── components/
│   │   │   ├── ChannelView.tsx          # Full channel UI — message list + input
│   │   │   ├── MessageBubble.tsx        # Single message with sender, time, reactions
│   │   │   ├── MessageInput.tsx         # Text input with @mention support
│   │   │   └── TypingIndicator.tsx      # "Raj is typing..." animated dots
│   │   ├── hooks/
│   │   │   └── useChatSocket.ts         # STOMP connect, subscribe, send — manages WS lifecycle
│   │   ├── services/
│   │   │   └── messageService.ts        # GET /messages?channelId=X (history, pagination)
│   │   ├── types/
│   │   │   └── chat.types.ts            # Channel, Message, TypingEvent
│   │   └── index.ts
│   │
│   ├── notifications/
│   │   ├── components/
│   │   │   ├── NotifBell.tsx            # Bell icon + unread badge in Topbar
│   │   │   ├── NotifItem.tsx            # Single notification row
│   │   │   └── NotifDrawer.tsx          # Slide-out inbox panel
│   │   ├── hooks/
│   │   │   └── useNotifications.ts      # Subscribes to WS notif topic, fetches inbox
│   │   ├── services/
│   │   │   └── notifService.ts          # GET /notifications, PATCH /notifications/{id}/read
│   │   ├── types/
│   │   │   └── notif.types.ts           # Notification, NotifType enum
│   │   └── index.ts
│   │
│   ├── members/
│   │   ├── components/
│   │   │   ├── MemberList.tsx
│   │   │   ├── MemberRow.tsx
│   │   │   └── InviteModal.tsx
│   │   ├── hooks/
│   │   │   └── useMembers.ts
│   │   ├── services/
│   │   │   └── memberService.ts         # Invitations, workspace members, org members
│   │   ├── types/
│   │   │   └── member.types.ts          # Member, Role, Invitation
│   │   └── index.ts
│   │
│   └── sprint/                          # Phase 2
│       ├── components/
│       │   ├── SprintBoard.tsx
│       │   ├── SprintCard.tsx
│       │   └── BurndownChart.tsx
│       ├── hooks/
│       │   └── useSprint.ts
│       ├── services/
│       │   └── sprintService.ts
│       ├── types/
│       │   └── sprint.types.ts          # Sprint, SprintStatus
│       └── index.ts
│
│
├── store/                               # Centralized Zustand — all slices in one place
│   │
│   ├── auth/
│   │   └── authStore.ts                 # user, isAuthed, login(), logout()
│   │                                    # Token lives in httpOnly cookie — NOT in this store
│   │
│   ├── workspace/
│   │   └── workspaceStore.ts            # activeOrg, activeWorkspace, activeProject, setActive*()
│   │
│   ├── task/
│   │   └── taskStore.ts                 # columns: Record<statusId, Task[]>
│   │                                    # moveTask() — optimistic update + rollback on error
│   │                                    # addTask(), updateTask(), removeTask()
│   │
│   ├── chat/
│   │   └── chatStore.ts                 # messages: Record<channelId, Message[]>
│   │                                    # typingUsers: Record<channelId, string[]>
│   │                                    # appendMessage(), setTyping() with auto-clear
│   │
│   ├── notification/
│   │   └── notifStore.ts               # unreadCount, notifications[]
│   │                                    # push() — increments unread + triggers toast
│   │                                    # markRead(), markAllRead()
│   │
│   └── index.ts                         # Re-exports all stores for clean imports
│                                        # e.g. import { useAuthStore } from '@/store'
│
│
├── components/                          # Shared UI — used by 2+ features, zero business logic
│   │
│   ├── ui/                             # shadcn CLI output — NEVER edit manually
│   │   ├── avatar.tsx
│   │   ├── badge.tsx
│   │   ├── button.tsx
│   │   ├── calendar.tsx
│   │   ├── card.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── progress.tsx
│   │   ├── scroll-area.tsx
│   │   ├── separator.tsx
│   │   ├── sheet.tsx
│   │   ├── sidebar.tsx
│   │   ├── skeleton.tsx
│   │   └── tooltip.tsx
│   │
│   ├── layout/                          # App shell components — used by (app)/layout.tsx
│   │   ├── AppShell.tsx                 # Sidebar + Topbar wrapper
│   │   ├── Sidebar.tsx                  # Nav, workspace list, channel list
│   │   └── Topbar.tsx                   # Search, notif bell, user menu
│   │
│   ├── marketing/                       # Only used by (marketing)/layout.tsx
│   │   ├── Navbar.tsx
│   │   ├── Footer.tsx
│   │   ├── OrgMarquee.tsx
│   │   └── ScrollReveal.tsx
│   │
│   └── common/                          # Tiny reusable pieces — used everywhere
│       ├── Avatar.tsx                   # Initials avatar with color hashing
│       ├── EmptyState.tsx               # Empty list placeholder with icon + message
│       ├── PageLoader.tsx               # Full-page skeleton while data loads
│       └── PriorityBadge.tsx            # HIGH / MEDIUM / LOW colored dot + label
│
│
├── lib/                                 # Stateless infrastructure — no state, no side effects
│   ├── api.ts                           # Axios instance
│   │                                    #   baseURL: NEXT_PUBLIC_API_URL
│   │                                    #   request interceptor: reads cookie → Bearer header
│   │                                    #   response interceptor: 401 → logout, errors → toast
│   ├── socket.ts                        # createStompClient(token) factory
│   │                                    #   SockJS + STOMP — no singleton, no state
│   │                                    #   SocketProvider manages the lifecycle
│   ├── auth.ts                          # Cookie helpers: getToken(), setToken(), clearToken()
│   └── utils.ts                         # cn(), formatDate(), truncate(), getInitials()
│
│
├── providers/                           # React context — all mounted in app/layout.tsx
│   ├── AuthProvider.tsx                 # Hydrates authStore from cookie on first render
│   ├── SocketProvider.tsx               # Creates STOMP client post-auth, exposes useSocket()
│   └── ToastProvider.tsx                # Mounts goey-toaster globally
│
│
├── constants/                           # App-wide static values — no logic
│   ├── routes.ts                        # ROUTES.dashboard, ROUTES.login, ROUTES.project() etc
│   ├── colors.ts                        # Priority colors, label palette
│   └── tags.ts                          # Tag definitions
│
│
├── hooks/                               # Truly global hooks — not tied to any single feature
│   └── use-mobile.ts                    # Viewport detection — used by Sidebar, AppShell
│
│
└── public/
    └── firebase-messaging-sw.js         # FCM service worker — add in Phase 2 only
```

---

## store/ in detail

```
store/
├── auth/
│   └── authStore.ts
├── workspace/
│   └── workspaceStore.ts
├── task/
│   └── taskStore.ts
├── chat/
│   └── chatStore.ts
├── notification/
│   └── notifStore.ts
└── index.ts                 ← the key file
```

### store/index.ts — single import point for all stores

```ts
// Re-export every store hook from one place
// Components and hooks import from '@/store', never from individual store files

export { useAuthStore }         from './auth/authStore'
export { useWorkspaceStore }    from './workspace/workspaceStore'
export { useTaskStore }         from './task/taskStore'
export { useChatStore }         from './chat/chatStore'
export { useNotifStore }        from './notification/notifStore'
```

Usage anywhere in the codebase:
```ts
import { useAuthStore, useTaskStore } from '@/store'
```

---

## tsconfig.json path aliases

Add these to `compilerOptions` so every import is clean and refactor-proof:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*":            ["./*"],
      "@/features/*":   ["./features/*"],
      "@/store":        ["./store/index.ts"],
      "@/store/*":      ["./store/*"],
      "@/components/*": ["./components/*"],
      "@/lib/*":        ["./lib/*"],
      "@/providers/*":  ["./providers/*"],
      "@/constants/*":  ["./constants/*"],
      "@/hooks/*":      ["./hooks/*"]
    }
  }
}
```

---

## middleware.ts

```ts
import { NextRequest, NextResponse } from 'next/server'

const PROTECTED_PREFIXES = ['/dashboard', '/inbox', '/my-tasks']
const AUTH_PAGES         = ['/login', '/register']
const TOKEN_COOKIE       = 'hivespace_token'

export function middleware(req: NextRequest) {
  const token      = req.cookies.get(TOKEN_COOKIE)?.value
  const { pathname } = req.nextUrl

  const isProtected = PROTECTED_PREFIXES.some(p => pathname.startsWith(p))
  const isAuthPage  = AUTH_PAGES.some(p => pathname.startsWith(p))

  if (isProtected && !token)
    return NextResponse.redirect(new URL('/login', req.url))

  if (isAuthPage && token)
    return NextResponse.redirect(new URL('/dashboard', req.url))

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
```

---

## features/*/index.ts — barrel pattern

Each feature exposes only what other features are allowed to use.
Internal store and service files are private to the module.

```ts
// features/auth/index.ts
export { LoginForm }    from './components/LoginForm'
export { RegisterForm } from './components/RegisterForm'
export { useAuth }      from './hooks/useAuth'
export type { User, AuthResponse } from './types/auth.types'
// authStore, authService — NOT exported. Private to this feature.
```

```ts
// features/kanban/index.ts
export { KanbanBoard }     from './components/KanbanBoard'
export { TaskDetailModal } from './components/TaskDetailModal'
export { useTasks }        from './hooks/useTasks'
export type { Task, TaskStatus, Priority } from './types/task.types'
```

---

## Import rules — enforce strictly

| From | Can import | Cannot import |
|---|---|---|
| `app/` pages | `features/*/index.ts`, `components/`, `@/store` | Feature internals, `lib/` directly |
| `features/*/components/` | Own feature files, `components/`, `@/store`, `lib/`, `constants/` | Other feature internals |
| `features/*/hooks/` | Own feature's service + types, `@/store`, `lib/` | Other feature stores directly |
| `features/*/services/` | `lib/api.ts`, own types | Stores, components, hooks |
| `store/*` | `lib/auth.ts` (for cookie) | Features, components |
| `lib/` | Nothing in the project | Everything else — zero upward deps |
| `components/layout/` | `features/*/index.ts`, `components/common/`, `@/store` | Feature internals |

---

## Packages to install

```bash
# HTTP + WebSocket
npm install axios @stomp/stompjs sockjs-client js-cookie
npm install -D @types/sockjs-client @types/js-cookie

# Drag and drop for Kanban
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities

# Replace goey-toast with sonner (shadcn-native, same author)
npm install sonner

# Date formatting (already have date-fns — good)
```

---

## What to migrate from current structure

| Current file | Move to |
|---|---|
| `lib/auth-store.ts` | `store/auth/authStore.ts` |
| `lib/data-store.ts` | Split → `store/workspace/workspaceStore.ts` + `store/task/taskStore.ts` |
| `lib/mock-data.ts` | Delete or move to `__mocks__/mockData.ts` |
| `lib/api-client.ts` | `lib/api.ts` (rename) |
| `lib/constants/*` | `constants/` (root level) |
| `components/providers/AuthProvider.tsx` | `providers/AuthProvider.tsx` |
| `components/kanban-board.tsx` | Split → `features/kanban/components/` |
| `components/activity-feed.tsx` | `features/notifications/components/` or `components/common/` |
| `components/app-sidebar.tsx` | `components/layout/Sidebar.tsx` |
| `components/dashboard-header.tsx` | `components/layout/Topbar.tsx` |
| `components/Navbar.tsx` | `components/marketing/Navbar.tsx` |
| `components/Footer.tsx` | `components/marketing/Footer.tsx` |
| `components/OrgMarquee.tsx` | `components/marketing/OrgMarquee.tsx` |
| `components/ScrollReveal.tsx` | `components/marketing/ScrollReveal.tsx` |
| `hooks/use-mobile.ts` | `hooks/use-mobile.ts` (stays — it's global) |
| `app/login/` | `app/(auth)/login/` |
| `app/register/` | `app/(auth)/register/` |
| `app/dashboard/` | `app/(app)/dashboard/` |
