Directory structure:
└── sanjaybarman15-hivespace_frontend/
    ├── README.md
    ├── components.json
    ├── DESIGN.md
    ├── DESIGN_RULE.md
    ├── Directory_Structure.md
    ├── eslint.config.mjs
    ├── Hivespace_Blueprint.md
    ├── hivespace_roadmap.md
    ├── new_structure.md
    ├── next.config.mjs
    ├── package.json
    ├── postcss.config.mjs
    ├── tsconfig.json
    ├── .env.example
    ├── .prettierignore
    ├── .prettierrc
    ├── app/
    │   ├── globals.css
    │   ├── layout.tsx
    │   ├── (auth)/
    │   │   ├── account/
    │   │   │   ├── layout.tsx
    │   │   │   ├── page.tsx
    │   │   │   ├── billing/
    │   │   │   │   └── page.tsx
    │   │   │   ├── connections/
    │   │   │   │   └── page.tsx
    │   │   │   ├── notifications/
    │   │   │   │   └── page.tsx
    │   │   │   ├── profile/
    │   │   │   │   └── page.tsx
    │   │   │   └── security/
    │   │   │       └── page.tsx
    │   │   ├── dashboard/
    │   │   │   ├── layout.tsx
    │   │   │   ├── page.tsx
    │   │   │   ├── ai/
    │   │   │   │   └── page.tsx
    │   │   │   ├── chat/
    │   │   │   │   └── [channel]/
    │   │   │   │       └── page.tsx
    │   │   │   ├── docs/
    │   │   │   │   ├── layout.tsx
    │   │   │   │   └── page.tsx
    │   │   │   ├── github/
    │   │   │   │   └── page.tsx
    │   │   │   ├── inbox/
    │   │   │   │   └── page.tsx
    │   │   │   ├── mail/
    │   │   │   │   └── page.tsx
    │   │   │   ├── projects/
    │   │   │   │   └── [projectSlug]/
    │   │   │   │       ├── page.tsx
    │   │   │   │       └── board/
    │   │   │   │           └── page.tsx
    │   │   │   ├── tasks/
    │   │   │   │   └── page.tsx
    │   │   │   └── teams/
    │   │   │       └── [teamSlug]/
    │   │   │           └── page.tsx
    │   │   └── settings/
    │   │       ├── layout.tsx
    │   │       ├── page.tsx
    │   │       ├── appearance/
    │   │       │   └── page.tsx
    │   │       ├── automations/
    │   │       │   └── page.tsx
    │   │       ├── danger/
    │   │       │   └── page.tsx
    │   │       ├── email/
    │   │       │   └── page.tsx
    │   │       ├── general/
    │   │       │   └── page.tsx
    │   │       ├── github/
    │   │       │   └── page.tsx
    │   │       ├── invoices/
    │   │       │   └── page.tsx
    │   │       ├── members/
    │   │       │   └── page.tsx
    │   │       ├── notifications/
    │   │       │   └── page.tsx
    │   │       ├── roles/
    │   │       │   └── page.tsx
    │   │       ├── seats/
    │   │       │   └── page.tsx
    │   │       ├── subscription/
    │   │       │   └── page.tsx
    │   │       └── webhooks/
    │   │           └── page.tsx
    │   ├── (public)/
    │   │   ├── page.tsx
    │   │   ├── invite/
    │   │   │   └── [token]/
    │   │   │       └── page.tsx
    │   │   ├── share/
    │   │   │   └── [id]/
    │   │   │       └── page.tsx
    │   │   ├── signin/
    │   │   │   └── page.tsx
    │   │   └── signup/
    │   │       └── page.tsx
    │   └── api/
    │       ├── auth/
    │       │   ├── callback/
    │       │   │   └── route.ts
    │       │   └── refresh/
    │       │       └── route.ts
    │       ├── upload/
    │       │   └── presign/
    │       │       └── route.ts
    │       └── webhooks/
    │           └── stripe/
    │               └── route.ts
    ├── components/
    │   ├── .gitkeep
    │   ├── common/
    │   │   ├── CommandPalette.tsx
    │   │   ├── CTAButton.tsx
    │   │   ├── EmptyState.tsx
    │   │   ├── ErrorBoundary.tsx
    │   │   ├── InviteModal.tsx
    │   │   ├── theme-provider.tsx
    │   │   └── UserAvatar.tsx
    │   ├── features/
    │   │   ├── chat/
    │   │   │   ├── MessageInput.tsx
    │   │   │   ├── MessageList.tsx
    │   │   │   ├── MessageReactions.tsx
    │   │   │   └── TypingIndicator.tsx
    │   │   ├── docs/
    │   │   │   └── HivespaceEditor.tsx
    │   │   ├── github/
    │   │   │   ├── CommitEntry.tsx
    │   │   │   ├── PRCard.tsx
    │   │   │   └── RepoLinker.tsx
    │   │   ├── settings/
    │   │   │   ├── InviteForm.tsx
    │   │   │   ├── MemberRow.tsx
    │   │   │   ├── PlanCard.tsx
    │   │   │   └── SettingsPlaceholder.tsx
    │   │   ├── tasks/
    │   │   │   ├── KanbanBoard.tsx
    │   │   │   ├── KanbanCard.tsx
    │   │   │   ├── TaskDetail.tsx
    │   │   │   └── TaskFilters.tsx
    │   │   └── teams/
    │   │       ├── ChannelsTab.tsx
    │   │       ├── ManageTeamSheet.tsx
    │   │       ├── MembersTab.tsx
    │   │       ├── OverviewTab.tsx
    │   │       ├── TasksTab.tsx
    │   │       ├── TeamBreadcrumbs.tsx
    │   │       └── TeamHeader.tsx
    │   ├── layout/
    │   │   ├── AccountSidebar.tsx
    │   │   ├── DocSidebar.tsx
    │   │   ├── NavRail.tsx
    │   │   ├── SettingsSidebar.tsx
    │   │   └── WorkspaceSidebar.tsx
    │   └── ui/
    │       ├── avatar.tsx
    │       ├── badge.tsx
    │       ├── button.tsx
    │       ├── card.tsx
    │       ├── checkbox.tsx
    │       ├── command.tsx
    │       ├── dialog.tsx
    │       ├── dropdown-menu.tsx
    │       ├── input-group.tsx
    │       ├── input.tsx
    │       ├── label.tsx
    │       ├── popover.tsx
    │       ├── progress.tsx
    │       ├── radio-group.tsx
    │       ├── scroll-area.tsx
    │       ├── select.tsx
    │       ├── separator.tsx
    │       ├── sheet.tsx
    │       ├── slider.tsx
    │       ├── switch.tsx
    │       ├── tabs.tsx
    │       ├── textarea.tsx
    │       └── tooltip.tsx
    ├── hooks/
    │   ├── useAuth.ts
    │   ├── useDebounce.ts
    │   ├── useDocuments.ts
    │   ├── useInfiniteScroll.ts
    │   ├── useMessages.ts
    │   ├── usePermission.ts
    │   ├── useTask.ts
    │   ├── useTasks.ts
    │   ├── useUpload.ts
    │   ├── useWebSocket.ts
    │   ├── useWorkspace.ts
    │   └── .gitkeep
    ├── lib/
    │   ├── constants.ts
    │   ├── utils.ts
    │   ├── websocket.ts
    │   ├── .gitkeep
    │   └── api/
    │       ├── auth.ts
    │       ├── channels.ts
    │       ├── client.ts
    │       ├── documents.ts
    │       ├── github.ts
    │       ├── invites.ts
    │       ├── messages.ts
    │       ├── orgs.ts
    │       ├── projects.ts
    │       ├── tasks.ts
    │       ├── uploads.ts
    │       └── workspaces.ts
    ├── public/
    │   └── .gitkeep
    ├── store/
    │   ├── authStore.ts
    │   ├── orgStore.ts
    │   ├── uiStore.ts
    │   └── workspaceStore.ts
    └── types/
        ├── api.ts
        ├── auth.ts
        ├── billing.ts
        ├── document.ts
        ├── github.ts
        ├── invite.ts
        ├── message.ts
        ├── org.ts
        ├── task.ts
        └── websocket.ts
