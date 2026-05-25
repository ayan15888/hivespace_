Critical Blocker 1 — Schema Mismatch (Do This Today)
Your JPA entities still reference columns that no longer exist in the new schema:

tasks.assignee_id — removed from schema, still in Task.java entity
tenants.members_count, tenants.workspaces_count — removed, still in Tenant.java
workspaces.members_count — removed, still in Workspace.java
teams.members_count — removed, still in Team.java
projects.members_count, projects.teams_count — removed, still in Project.java
TaskStatus.BACKLOG — in code enum but not in DB CHECK constraint
tenants.owner_id — in new schema but no mapping in Tenant.java

With ddl-auto=validate your app will fail to start against the new schema unless these are fixed first. Give your agent this as Batch 1:
Remove from all JPA entity classes:
- Task.java: remove assignee field and @JoinColumn(name="assignee_id")
- Tenant.java: remove membersCount, workspacesCount fields
               add owner_id UUID field with @Column(name="owner_id")
- Workspace.java: remove membersCount field
- Team.java: remove membersCount field
- Project.java: remove membersCount, teamsCount fields

Remove from TaskStatus enum:
- Remove BACKLOG value (not in DB CHECK constraint)
  Valid values are: TODO, IN_PROGRESS, IN_REVIEW, DONE, CANCELLED

Remove from all service methods any manual counter updates:
- TenantService: remove any membersCount++ or workspacesCount++ logic
- WorkspaceService: remove membersCount++ logic
- TeamService: remove membersCount++ logic
- ProjectService: remove membersCount++, teamsCount++ logic

After these changes, restart Spring Boot with ddl-auto=validate
and confirm clean startup against the new schema.
