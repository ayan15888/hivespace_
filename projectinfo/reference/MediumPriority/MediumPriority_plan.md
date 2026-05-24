Medium Priority — Missing Endpoints After high fixes
These are missing from your API surface and should be added after the above fixes:
POST /api/auth/switch-tenant        ← already covered in Blocker 2
POST /api/auth/refresh              ← JWT refresh without re-login

Workspace member management:
  POST   /api/workspaces/{id}/members
  PATCH  /api/workspaces/{id}/members/{uid}/role
  DELETE /api/workspaces/{id}/members/{uid}

Invitation management:
  DELETE /api/i/{id}               ← revoke invite

Project management:
  PUT /api/projects/{id}           ← update project settings
  GET /api/teams/{id}              ← get single team detail

Shareable links:
  POST  /api/projects/{id}/share   ← generate sharing link
  GET   /api/share/{token}         ← public endpoint, no auth
  PATCH /api/share/{id}/revoke     ← revoke link