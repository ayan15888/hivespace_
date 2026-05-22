What the Roles & Permissions Page Actually Is
This page is not where you create custom roles. Your roles are fixed — OWNER, ADMIN, BILLING_ADMIN, MEMBER at org level, LEAD/MEMBER/VIEWER at lower levels. These are hardcoded in your CHECK constraints and enforced by your backend.
What this page actually does is two things:
1. Shows what each role can do — a reference matrix so org members understand what permissions each role carries.
2. Lets Org Admins assign and change roles for existing members — promoting a Member to Admin, demoting someone, assigning Billing Admin to the finance person.

Page Structure
Section 1 — Role Definitions
A clear visual breakdown of every role and what it can do. This is read-only, informational:
ORG LEVEL ROLES

┌─────────────────┬──────────────────────────────────────────────┐
│ Owner           │ Full org control. Cannot be removed.          │
│                 │ Manages admins. Owns billing.                 │
├─────────────────┼──────────────────────────────────────────────┤
│ Admin           │ Manages members, invites, org settings.       │
│                 │ Same access as Owner except cannot remove     │
│                 │ Owner or promote other Admins.                │
├─────────────────┼──────────────────────────────────────────────┤
│ Billing Admin   │ Billing portal only. Cannot see projects,     │
│                 │ tasks, teams, or any workspace data.          │
├─────────────────┼──────────────────────────────────────────────┤
│ Member          │ Can be assigned tasks, join channels,         │
│                 │ edit docs, participate in projects.           │
└─────────────────┴──────────────────────────────────────────────┘

WORKSPACE LEVEL ROLES
┌─────────────────┬──────────────────────────────────────────────┐
│ Admin           │ Manages workspace settings and membership.    │
├─────────────────┼──────────────────────────────────────────────┤
│ Member          │ Full workspace access.                        │
├─────────────────┼──────────────────────────────────────────────┤
│ Viewer          │ Read-only access.                             │
└─────────────────┴──────────────────────────────────────────────┘

PROJECT LEVEL ROLES
┌─────────────────┬──────────────────────────────────────────────┐
│ Lead            │ Manages board, milestones, sharing links,     │
│                 │ project membership.                           │
├─────────────────┼──────────────────────────────────────────────┤
│ Member          │ Full project access, task assignment.         │
├─────────────────┼──────────────────────────────────────────────┤
│ Viewer          │ Read-only access.                             │
└─────────────────┴──────────────────────────────────────────────┘

TEAM LEVEL ROLES
┌─────────────────┬──────────────────────────────────────────────┐
│ Lead            │ Manages team membership and task assignments. │
├─────────────────┼──────────────────────────────────────────────┤
│ Member          │ Standard team access.                         │
└─────────────────┴──────────────────────────────────────────────┘

Section 2 — Permission Matrix
A visual grid showing exactly what each org-level role can and cannot do. This is the most useful part of the page for admins:
                          OWNER   ADMIN   BILLING   MEMBER
Invite new members          ✓       ✓        ✗        ✗
Remove members              ✓       ✓        ✗        ✗
Promote to Admin            ✓       ✗        ✗        ✗
Manage billing              ✓       ✗        ✓        ✗
View invoices               ✓       ✗        ✓        ✗
Create workspaces           ✓       ✓        ✗        ✗
Delete workspaces           ✓       ✓        ✗        ✗
View all projects           ✓       ✓        ✗        ✗
Manage org settings         ✓       ✓        ✗        ✗
Delete organization         ✓       ✗        ✗        ✗
Generate invite links       ✓       ✓        ✗        ✗
Revoke invite links         ✓       ✓        ✗        ✗

Section 3 — Member Role Management
This is the interactive part. A list of all org members with their current role and the ability to change it. Only visible to Org Owner and Org Admin:
MEMBERS (24)

Search members...

┌──────────────────┬──────────────┬───────────────┬──────────┐
│ Member           │ Joined       │ Current Role  │ Actions  │
├──────────────────┼──────────────┼───────────────┼──────────┤
│ Rahul Singh      │ 3 days ago   │ Owner         │ —        │
│ Sanjay Barman    │ 2 days ago   │ Admin         │ Change   │
│ Priya Mehta      │ 1 day ago    │ Member        │ Change   │
│ Ravi Kumar       │ 5 hours ago  │ Billing Admin │ Change   │
└──────────────────┴──────────────┴───────────────┴──────────┘
Clicking "Change" on a row opens a small dropdown inline — not a modal — showing the roles the current user is allowed to assign. Owner row shows no actions — the Owner cannot be changed by anyone.

How Role Changes Actually Work
When an Admin clicks Change on a member and selects a new role, your frontend calls:
PATCH /api/tenants/{tenantId}/members/{userId}/role
Body: { role: "ADMIN" }
Your Spring Boot backend validates:

Is the requester an Owner or Admin
Is the requester trying to assign a role they are allowed to assign
Is the target user the Owner — if yes, reject always
If promoting to ADMIN, is the requester the Owner — if not, reject

On success the tenant_members row is updated with the new role. The response returns the updated member so the frontend updates the row in place without a full page reload.

What Org Admins Cannot Do From This Page
Be explicit about these restrictions in the UI — grey out or hide the actions entirely rather than showing them and then rejecting:

Cannot change the Owner's role — Owner row has no Change button
Admin cannot promote another person to Admin — that option simply does not appear in their dropdown
Admin cannot demote another Admin — only Owner can do this
Nobody can assign Owner role from this page — Owner is set at org creation, never reassigned here


Who Can See This Page
Gate the entire page in your frontend middleware and backend:

Org Owner — sees everything, all actions available
Org Admin — sees Section 1 and 2 fully, Section 3 with restricted actions
Billing Admin — sees Section 1 only (role definitions), no member management
Member — sees Section 1 only, no member management section at all

The simplest way to handle this in Next.js is checking the user's tenant role from your auth store and conditionally rendering sections. Your backend enforces the same rules independently — frontend gating is just UX, backend is the real enforcement.

Backend Endpoints Needed
GET  /api/tenants/{tenantId}/members          -- list all members with roles
PATCH /api/tenants/{tenantId}/members/{userId}/role  -- change a member's role
DELETE /api/tenants/{tenantId}/members/{userId}      -- remove a member (goes on Members page not here)
The roles and permissions page only needs the first two. Member removal belongs on the Members settings page, not the Roles page.

No Schema Changes Needed
Everything this page needs is already in your schema. The tenant_members table has user_id, tenant_id, role, and joined_at. That is all the data this page reads and writes. Nothing new required.