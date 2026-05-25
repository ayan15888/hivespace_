Critical Blocker 4 — Exception Types (Fix With Blocker 3)
The report correctly identifies that SecurityException is thrown for domain validation errors (like last-lead invariant) which maps to 403, but these should be 400. This also affects the frontend error handling contract. Create typed exceptions:
Create these exception classes:
  DomainValidationException extends RuntimeException
    → mapped to HTTP 400 in GlobalExceptionHandler
    → used for: last-lead invariant, invalid status transition,
                subtask depth violation, invalid team assignment

  ConflictException extends RuntimeException  
    → mapped to HTTP 409 in GlobalExceptionHandler
    → used for: already a project member, duplicate assignee

  NotFoundException extends RuntimeException
    → mapped to HTTP 404 in GlobalExceptionHandler
    → used for: task not found, project not found, user not found

  ForbiddenException extends RuntimeException
    → mapped to HTTP 403 in GlobalExceptionHandler
    → used for: all permission/authorization failures

Update GlobalExceptionHandler to map these four exception types.

Replace all SecurityException throws that represent domain rule
violations with DomainValidationException:
  - Last lead demotion: DomainValidationException 400
  - Last lead removal: DomainValidationException 400
  - Invalid status transition: DomainValidationException 400
  - Subtask of subtask: DomainValidationException 400
  - Team not in project: DomainValidationException 400

Replace all SecurityException throws for permission failures
with ForbiddenException:
  - Not a project member: ForbiddenException 403
  - Viewer cannot create tasks: ForbiddenException 403
  - Not a team lead: ForbiddenException 403
