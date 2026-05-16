# HiveSpace Implementation Guide: Connecting Frontend & Backend

This guide outlines the immediate steps to bridge the gap between your beautiful UI shells and the Spring Boot backend, specifically focusing on the **Tasks** module (Phase 1 & 6) and the overall data flow.

## 1. Where to Start (The "Flow-wise" Approach)

Currently, your backend handles Org/Workspace/Project/Team logic, but the **Task Management** (the heart of HiveSpace) is missing from the backend.

### Step A: The Backend Task Model
You need to create a `Task` entity and an `Assignment` entity (to handle multi-assignee support).

**Proposed Model Changes:**
- **Task Entity**: Fields for `title`, `description`, `priority`, `status`, `dueDate`, and relationships to `Project` and `User` (Owner).
- **TaskAssignment Entity**: A join table/entity for collaborators and reviewers.

### Step B: The Backend API
Create a `TaskController` with endpoints:
- `GET /api/tasks/project/{projectId}`
- `POST /api/tasks`
- `PATCH /api/tasks/{taskId}` (for status updates/Kanban moves)

### Step C: Frontend Integration
In `hivespace_frontend/app/(auth)/dashboard/tasks/page.tsx`:
1. Remove `INITIAL_TASKS` mock data.
2. Implement a `useEffect` hook to fetch tasks from your backend.
3. Update the `handleQuickAdd` function to make a `POST` request to the backend.

---

## 2. Model Changes Required

To align with the **Blueprint (`markdown.md`)**, you need to add the following to your backend:

### New Entities to Create:
1. **`Task`**:
   - `UUID id`
   - `String title`
   - `String description`
   - `TaskPriority priority` (Enum: URGENT, HIGH, NORMAL)
   - `TaskStatus status` (Enum: TODO, IN_PROGRESS, REVIEW, DONE)
   - `Date dueDate`
   - `Project project` (Many-to-One)
   - `User owner` (Many-to-One)

2. **`TaskAssignment`** (For Multi-Assignee Support):
   - `Task task`
   - `User user`
   - `AssignmentRole role` (Enum: COLLABORATOR, REVIEWER)

### Planned Entities (For later phases):
- **`Channel` & `Message`**: For the Chat System (Phase 3).
- **`Document` & `DocumentVersion`**: For the Knowledge Base (Phase 4).

---

## 3. Connecting the Frontend (API Flow)

Your frontend is currently a "shell". To connect it:

1. **Base URL**: Ensure your frontend environment variables (`.env.local`) point to `http://localhost:8080`.
2. **Auth Interceptor**: Use a fetch wrapper or Axios interceptor to attach the JWT token (stored in cookies or localStorage) to every request.
3. **Optimistic UI**: Since your frontend already has state management for tasks (the `tasks` state), keep using it but sync with the backend in the background.

---

## 4. Flowise & AI Integration (Phase 7)

If you are planning to use **Flowise** (the AI Orchestration tool) for the "AI Assistant" or "Smart Triage":

1. **Deployment**: Run Flowise via Docker or on a separate port (e.g., 3000).
2. **Spring Boot Integration**: 
   - Create an `AIService` in your backend.
   - Use `RestTemplate` or `WebClient` to call the Flowise API endpoints.
   - Secure your Flowise API using the `API_KEY` provided by Flowise.
3. **Frontend**: The `/dashboard/ai` page should call your *Spring Boot* backend, which then proxies the request to Flowise. This keeps your Flowise API keys safe.

---

## 5. Immediate Next Steps

1. **Run Migrations**: Since `ddl-auto=update` is on, creating the `Task.java` file will automatically update your database.
2. **Update SQL**: Update your `entity.sql` file to reflect the new `tasks` and `assignments` tables so your schema documentation stays current.
3. **Connect Projects Page**: The `projects` page in the frontend should be the first to move from mock to real data, as it's the simplest "parent" entity.
