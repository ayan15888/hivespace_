The Four Tables — What They Are Actually For
Let me explain how these four tables work together because there is genuine confusion about the relationship between projects and teams.
projects — a project is a piece of work with a defined scope and timeline. It has a board, tasks, milestones, start and end dates. Think of it like a Jira project or a Linear project. The Frontend Redesign is a project. The API Revamp is a project.
project_members — tracks which individual users are working on a project and what their role is. A user is a LEAD, MEMBER, or VIEWER on this specific project. This is person-level membership.
teams — a team is a group of people who work together repeatedly. The Backend Team, the Frontend Team, the Design Team. Teams are workspace-scoped — they exist independently and can be assigned to work on multiple projects over time. Think of teams as departments.
team_members — tracks which users are in which team and their role within that team.
The relationship between teams and projects is the key thing to understand:
A TEAM can be assigned to work on a PROJECT
         ↓
tasks.team_id links a task to the team responsible for it
teams.project_id links a team to its current primary project
When a team is assigned to a project, all team members become eligible to be assigned tasks within that project. They do not automatically become project_members — those are explicitly added. Team assignment is more like saying "the Backend Team is responsible for this project" rather than adding each person individually.

The points Column
Points are story points — a way to estimate the effort or complexity of a task. This comes from Agile/Scrum methodology. A simple bug fix might be 1 point. A complex new feature might be 8 or 13 points.
They are used for sprint planning — a team decides they can complete 20 points per sprint based on historical velocity. The project board shows total points per sprint and completed points so the team can track whether they are on track.
If you are not doing Agile sprint planning you can ignore this column for now. It is optional on the task form. Many teams never use it. But it is worth keeping in the schema because once you add sprint planning features it becomes very useful for velocity tracking and burndown charts.

The parent_id Column
This enables subtasks. A task can have child tasks. For example:
Task: "Build authentication system"  (parent_id = null)
  └── Subtask: "Create login endpoint"     (parent_id = auth-task-uuid)
  └── Subtask: "Add JWT validation"        (parent_id = auth-task-uuid)
  └── Subtask: "Write auth tests"          (parent_id = auth-task-uuid)
The parent task shows progress based on how many subtasks are completed — "2 of 3 subtasks done." On the Kanban board only parent tasks are shown as cards. Subtasks appear inside the task detail panel as a checklist. When all subtasks are done the parent can be auto-marked as done if you want that behaviour.
ON DELETE CASCADE means if you delete the parent task, all its subtasks are deleted too.

The Team Assignment to Projects Problem
You said projects do not have proper team assignment. Here is what needs to happen.
The teams.project_id column currently allows a team to be loosely associated with a project. But this is a weak one-to-one association — a team can only have one project_id at a time which is too restrictive. The Backend Team might work on both the API Revamp project and the Auth Service project simultaneously.
You need a proper many-to-many join table. Add this to your schema:
sqlCREATE TABLE project_teams (
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP NOT NULL DEFAULT now(),
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  PRIMARY KEY (project_id, team_id)
);

CREATE INDEX idx_project_teams_project ON project_teams(project_id);
CREATE INDEX idx_project_teams_team ON project_teams(team_id);
And drop the project_id from teams since it is now redundant:
sqlALTER TABLE teams DROP COLUMN project_id;
Now the relationship is clean — a team can be assigned to multiple projects, a project can have multiple teams working on it.
How Team Assignment Works in Practice
Project Lead opens project settings → Teams tab
        ↓
Clicks "Assign Team"
        ↓
Picker shows all teams in the workspace
        ↓
Lead selects "Backend Team"
        ↓
POST /api/projects/{projectId}/teams
Body: { teamId: "..." }
        ↓
Backend creates project_teams row
        ↓
Backend validates caller is Project Lead or Workspace Admin
        ↓
Backend returns updated project with assigned teams
When a team is assigned to a project, tasks in that project can now have team_id set to that team. The task assignee picker shows members from the assigned teams first, then other project members.

Task Assignment Scope Fix
You said tasks can currently be assigned to anyone. This is wrong and needs fixing. Task assignment should be restricted to project members only.
When the assignee picker opens on a task it should call:
GET /api/projects/{projectId}/members
Not a general user search. Only people who are explicitly project_members of this project should appear in the picker. If someone is in the workspace but not added to the project they should not appear.