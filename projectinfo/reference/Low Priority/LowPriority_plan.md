Low Priority — Code Quality
These can be done incrementally as you touch each file:

Remove System.out.println debugging from TaskController
Remove workspaceId from ProjectRequest body since it is already in the path
Split InvitationService into Command, Validation, and Enrollment services when it next needs significant changes
Push getProjectsByWorkspace filtering to DB query instead of in-memory filtering
Add @Valid and bean validation constraints to DTOs that are missing them