components/
  ui/                   -- your existing ShadCN components, keep as-is
  layout/               -- renamed from root-level layout components
    NavRail.tsx
    WorkspaceSidebar.tsx
    DocSidebar.tsx
    AccountSidebar.tsx
    SettingsSidebar.tsx
  common/               -- shared across features
    CTAButton.tsx
    InviteModal.tsx
    theme-provider.tsx
    CommandPalette.tsx  -- Cmd+K search (missing, needed early)
    UserAvatar.tsx      -- consistent avatar across app
    EmptyState.tsx      -- empty state component for lists
    ErrorBoundary.tsx   -- catches render errors in production
  features/             -- feature-specific components
    tasks/
      KanbanBoard.tsx
      KanbanCard.tsx
      TaskDetail.tsx
      TaskFilters.tsx
    chat/
      MessageList.tsx
      MessageInput.tsx
      TypingIndicator.tsx
      MessageReactions.tsx
    docs/
      HivespaceEditor.tsx  -- your existing file, move here
    teams/
      ChannelsTab.tsx      -- your existing files, move here
      ManageTeamSheet.tsx
      MembersTab.tsx
      OverviewTab.tsx
      TasksTab.tsx
      TeamBreadcrumbs.tsx
      TeamHeader.tsx
    github/
      PRCard.tsx
      CommitEntry.tsx
      RepoLinker.tsx
    settings/
      MemberRow.tsx
      InviteForm.tsx
      PlanCard.tsx