# Implementation Plan - Fix Team Loading in Sidebar and Team Creation

This plan addresses the database schema mismatch and resolves the team loading and creation flow issues.

## User Review Required

> [!IMPORTANT]
> The error `column t1_0.workspace_id does not exist` is caused by a mismatch between the schema defined in `newSchema.sql` (where `teams` only belongs to a project, lacking a `workspace_id`) and the actual Supabase database schema (`note.txt`) expected by the Java backend model classes (`Team.java`).
>
> To solve this safely without manual DB intervention, we will add a pre-startup JDBC migration script to `HiveSpaceApplication.java`. This will automatically align the database schema with the model requirements before Spring Boot starts up Hibernate/JPA.

## Proposed Changes

---

### Backend (Database Alignment & Pre-startup Migration)

#### [MODIFY] [HiveSpaceApplication.java](file:///d:/project/hiveSpace_final/backend/src/main/java/com/project/hiveSpace/HiveSpaceApplication.java)
- Connect to the PostgreSQL database in the `main` method before starting the Spring Context.
- Run SQL schema-alignment queries to ensure:
  - `tenants` table has `members_count` and `workspaces_count` columns.
  - `workspaces` table has `members_count` and `plan` columns.
  - `projects` table has `members_count` and `teams_count` columns.
  - `teams` table has `workspace_id` (foreign key) and `members_count` columns, and `project_id` is nullable.
  - `employees` table is created if missing.
  - Existing teams are assigned to a valid workspace so we can enforce `NOT NULL` constraint safely.

---

### Frontend (Sidebar Auto-Refresh on Team Creation)

#### [MODIFY] [WorkspaceSidebar.tsx](file:///d:/project/hiveSpace_final/frontend/components/layout/WorkspaceSidebar.tsx)
- Destructure the `refresh` method (as `refreshTeams`) from `useTeams`.
- Pass `onSuccess={refreshTeams}` to the `CreateTeamModal` component. This ensures the sidebar fetches the updated list of teams immediately after a new team is created.

---

## Verification Plan

### Automated / Startup Verification
1. Run `./gradlew.bat bootRun` in the `backend` folder to ensure it starts up without column-missing errors.
2. Confirm the console log displays:
   `✅ Pre-startup DB Connected` and `🚀 Pre-startup schema alignment migration completed successfully!`

### Manual Verification
1. Open the UI, click "Create Team" in the sidebar, fill in a name and description, and submit.
2. Verify the gooey toast indicates successful creation and that the newly created team appears in the sidebar instantly without needing a page refresh.
