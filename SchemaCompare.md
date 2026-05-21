# Database Schema Comparison Report

## Overview

This document compares the **IDE planned schema** with the **current database schema**.

Overall conclusion:

* The IDE schema is more structured and production-ready.
* The current DB schema appears ORM-generated and lacks several constraints and safety features.
* The IDE schema is closer to systems like Jira, Linear, Notion, and ClickUp.

---

# 1. TENANTS

## IDE Schema Features

```sql
created_at TIMESTAMP NOT NULL DEFAULT now(),
updated_at TIMESTAMP NOT NULL DEFAULT now(),
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
active BOOLEAN NOT NULL DEFAULT true,
CHECK (plan IN ('FREE', 'PRO', 'ULTIMATE', 'ENTERPRISE'))
```

## Current DB Missing

* `created_at`
* `updated_at`
* `DEFAULT gen_random_uuid()`
* `DEFAULT active=true`
* automatic timestamp defaults

## Comparison

| Feature              | IDE | Current |
| -------------------- | --- | ------- |
| Audit timestamps     | ✅   | ❌       |
| Auto UUID generation | ✅   | ❌       |
| Default values       | ✅   | ❌       |
| Plan validation      | ✅   | ✅       |

## Verdict

The current table is functional but lacks lifecycle tracking and automatic defaults.

---

# 2. USERS

## IDE Schema Features

```sql
username VARCHAR NOT NULL UNIQUE,
email VARCHAR NOT NULL UNIQUE,
github_username VARCHAR,
created_at TIMESTAMP NOT NULL DEFAULT now(),
updated_at TIMESTAMP NOT NULL DEFAULT now()
```

## Current DB Missing

* `github_username`
* `created_at`
* `updated_at`
* automatic defaults
* UNIQUE constraint on username

## Critical Difference

### IDE Schema

```sql
username VARCHAR NOT NULL UNIQUE
```

### Current DB

```sql
username character varying NOT NULL
```

Duplicate usernames are possible in the current database.

## Comparison

| Feature         | IDE | Current |
| --------------- | --- | ------- |
| github_username | ✅   | ❌       |
| username UNIQUE | ✅   | ❌       |
| timestamps      | ✅   | ❌       |
| auto defaults   | ✅   | ❌       |

## Verdict

This is one of the biggest schema mismatches.

---

# 3. WORKSPACES

## IDE Schema Features

```sql
created_by UUID REFERENCES users(id) ON DELETE SET NULL,
tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE
```

## Current DB Differences

Missing:

* `created_by`

Extra:

```sql
plan character varying NOT NULL
```

## Architectural Difference

### IDE Schema

Billing exists at tenant level.

### Current Schema

Billing exists at workspace level.

## Comparison

| Feature        | IDE | Current |
| -------------- | --- | ------- |
| created_by     | ✅   | ❌       |
| workspace plan | ❌   | ✅       |

## Verdict

You need to decide whether billing is:

* organization-based
  OR
* workspace-based

---

# 4. WORKSPACE_MEMBERS

## IDE Schema Features

```sql
UNIQUE (workspace_id, user_id),
CHECK (role IN ('ADMIN', 'MEMBER', 'VIEWER')),
DEFAULT 'MEMBER'
```

## Current DB Missing

* UNIQUE constraint
* CHECK constraint
* delete rules
* default role

## Risk

The current schema allows:

* duplicate memberships
* invalid roles

Example:

```sql
role='SUPER_ADMIN_GOD'
```

would still be accepted.

## Verdict

The IDE schema is much safer.

---

# 5. TENANT_MEMBERS

## Current DB Missing

* `UNIQUE(tenant_id, user_id)`
* CHECK constraints
* default roles
* cascade delete rules

## Result

Duplicate memberships and invalid roles are possible.

---

# 6. PROJECTS

## IDE Schema Features

```sql
created_by UUID REFERENCES users(id),
CHECK (status IN ('ACTIVE', 'ARCHIVED', 'COMPLETED')),
DEFAULT 'ACTIVE'
```

## Current DB Missing

* `created_by`
* status validation
* defaults
* cascade delete rules

## Comparison

| Feature        | IDE | Current |
| -------------- | --- | ------- |
| created_by     | ✅   | ❌       |
| status CHECK   | ✅   | ❌       |
| defaults       | ✅   | ❌       |
| cascade delete | ✅   | ❌       |

## Verdict

The current schema is simpler but less safe.

---

# 7. PROJECT_MEMBERS

## Current DB Missing

* `UNIQUE(project_id, user_id)`
* role validation
* default roles
* cascade delete rules

## Verdict

The IDE schema better prevents duplicate memberships and invalid roles.

---

# 8. TEAMS

## Major Architectural Difference

### IDE Schema

```sql
project_id UUID NOT NULL REFERENCES projects(id)
```

### Current DB

```sql
project_id uuid,
workspace_id uuid NOT NULL
```

---

## IDE Structure

```text
Workspace
 └── Project
      └── Team
```

A team belongs to exactly one project.

---

## Current Structure

```text
Workspace
 ├── Team
 └── Project
```

Teams can exist independently from projects.

---

## Comparison

| Feature                           | IDE | Current |
| --------------------------------- | --- | ------- |
| Team requires project             | ✅   | ❌       |
| Team linked to workspace directly | ❌   | ✅       |
| Strict hierarchy                  | ✅   | ❌       |
| Flexible structure                | ❌   | ✅       |

## Verdict

This is one of the largest architectural differences.

The IDE schema is more organized.
The current schema is more flexible.

---

# 9. TEAM_MEMBERS

## Current DB Missing

* `UNIQUE(team_id, user_id)`
* role validation
* default role
* cascade delete rules

## Verdict

The IDE schema provides stronger integrity guarantees.

---

# 10. INVITATIONS

## Similarity

The current schema is very close to the IDE schema.

## Current DB Missing

* status CHECK constraint
* defaults
* delete cascade rules
* automatic UUID generation
* automatic timestamps

## Verdict

Mostly aligned structurally.

---

# 11. INVITATION_ATTEMPTS

## Current DB Missing

* automatic UUID generation
* timestamp defaults
* ON DELETE CASCADE

## Verdict

The structures are otherwise very similar.

---

# 12. TASKS

## Major Differences

### IDE Schema Features

```sql
team_id UUID REFERENCES teams(id),
created_by UUID REFERENCES users(id),
parent_id UUID REFERENCES tasks(id),
CHECK constraints for status,
CHECK constraints for priority
```

### Current DB Features

```sql
assignee_id uuid
```

---

## Missing in Current DB

| Feature             | Missing? |
| ------------------- | -------- |
| subtasks            | ✅        |
| team ownership      | ✅        |
| creator tracking    | ✅        |
| status validation   | ✅        |
| priority validation | ✅        |
| delete rules        | ✅        |

---

## Extra in Current DB

```sql
assignee_id uuid
```

This field does not exist in the IDE schema.

---

## Important Design Observation

A production-ready task system usually needs BOTH:

```sql
created_by UUID,
assignee_id UUID
```

* `created_by` → who created the task
* `assignee_id` → who is assigned to the task

---

# Overall Architecture Comparison

| Area                 | IDE Schema | Current Schema         |
| -------------------- | ---------- | ---------------------- |
| SaaS readiness       | Strong     | Medium                 |
| Data integrity       | Strong     | Weak                   |
| Constraints          | Many       | Few                    |
| Audit tracking       | Good       | Limited                |
| Role validation      | Strong     | Weak                   |
| Duplicate prevention | Good       | Missing in many places |
| Hierarchical tasking | Yes        | No                     |
| Team architecture    | Strict     | Flexible               |
| ORM-generated feel   | No         | Yes                    |

---

# Biggest Problems In Current DB

## 1. Missing UNIQUE Constraints

Especially in:

* workspace_members
* team_members
* project_members
* tenant_members
* username

This can create duplicate memberships.

---

## 2. Missing CHECK Constraints

Current DB allows invalid:

* roles
* statuses
* priorities

---

## 3. Missing Subtask Support

The IDE schema supports:

```sql
parent_id REFERENCES tasks(id)
```

The current DB does not.

---

## 4. Missing Audit Timestamps

Many tables lack:

```sql
created_at,
updated_at
```

---

## 5. Missing Delete Rules

The IDE schema carefully defines:

```sql
ON DELETE CASCADE
ON DELETE SET NULL
```

The current DB mostly relies on defaults.

---

# Final Verdict

The IDE schema is significantly better for a modern task management platform similar to:

* Jira
* Linear
* Notion
* ClickUp

The current schema feels like:

* an early ORM-generated version
* less normalized
* missing production-grade constraints
* lacking safety guarantees

The IDE schema is much closer to production quality and long-term scalability.
