The Three Assignment Concepts
Assigning a task to a team — the tasks.team_id column. This says "this task belongs to the Backend Team." It is an organisational label, not an individual assignment. It helps filter tasks by team on the board and links the task to a team's workload. Only one team per task.
Assigning a task to individual people — the task_assignees table. This is who is actually doing the work. These people must be explicit project_members. Each person has a role: OWNER, COLLABORATOR, or REVIEWER.
The member picker source — when you open the assignee picker on a task, who appears in the list? This is what your question is really getting at.

How the Member Picker Should Work
When a user opens the assignee picker on a task, the list should show project members only — people who have an explicit row in project_members for this project.
But here is the practical UX implication of team assignment — if the Backend Team is assigned to the project via project_teams, the team's members are not automatically project members. A Project Lead still needs to explicitly add them to project_members before they appear in the assignee picker.
This is the correct strict behaviour per the reference architecture. Team assignment to a project means "this team is responsible for this project" at an organisational level. It does not automatically grant each team member project membership.

The Full Flow
Backend Team is assigned to Auth Project via project_teams
        ↓
Backend Team has 5 members in team_members
        ↓
Project Lead must explicitly add those 5 people to project_members
        ↓
Now those 5 appear in the task assignee picker
        ↓
Task creator picks Sanjay from the picker
        ↓
task_assignees row created: Sanjay as OWNER
        ↓
Optionally set tasks.team_id = Backend Team
(labels the task as belonging to the team)

What the Task Creation Form Should Show
ASSIGNEE (Owner):
  Source: project_members of this project
  Shows: everyone explicitly added to project_members
  Note: if a team member is not in project_members they do not appear
        until the project lead adds them explicitly

TEAM:
  Source: project_teams for this project
  Shows: teams assigned to this project
  This is a label/filter, not an individual assignment
  Optional — leave blank if the task has no team ownership

COLLABORATORS / REVIEWERS:
  Same source as OWNER: project_members only

The UX Improvement Worth Adding
Because this "add to project first" requirement creates friction, your UI should handle the gap gracefully. When a Project Lead is on the task creation form and selects a team from the Team dropdown, show a helper below the assignee picker:
Backend Team is assigned to this project.
Team members not yet added to this project:
  Sanjay Barman, Priya Mehta  [Add all to project]
Clicking "Add all to project" calls POST /api/projects/{id}/members for each person and then they immediately appear in the assignee picker. This keeps the strict rule intact while removing the friction.

Summary
WhatWhere storedWho can be selectedTask belongs to a teamtasks.team_idAny team in project_teamsTask assigned to a persontask_assigneesOnly explicit project_membersAssignee picker source—project_members table only
The team assignment on a task and the individual assignees are completely separate concerns. Team is an organisational label. Individual assignees are the actual people doing the work. Both can coexist on the same task — a task can say "this belongs to the Backend Team" AND "Sanjay is the owner, Priya is the reviewer."