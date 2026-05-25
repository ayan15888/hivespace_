Critical Blocker 3 — Project Membership via Team (Fix After Tenant Boundary)
This is a privilege escalation bug. Team members of an assigned team currently gain project member abilities without an explicit project_members row. The fix:
In RbacService.hasProjectRole(projectId, requiredRole):
  Remove the fallback block that checks team_members via project_teams.
  
  Before:
    1. Check project_members row → if found, use it
    2. IF NOT FOUND: check if user is member of any team in project_teams
       for this project → treat as MEMBER
  
  After:
    1. Check project_members row → if found, use it
    2. IF NOT FOUND: return false (no implicit membership)
    
  The workspace admin override bridge rule stays unchanged —
  that is explicit and intentional.

In ProjectMemberService.getMembersByProject():
  Remove the "virtual members" block that adds team members
  who are not explicit project_members.
  Return only rows from project_members table.
  If consumers need "team members in assigned teams" as a separate
  concept, create a separate endpoint: 
  GET /api/projects/{id}/team-members

This change will break task assignment for users who were implicitly
project members via teams. They will now need explicit project_members
rows. This is the correct behaviour.