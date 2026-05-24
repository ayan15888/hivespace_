const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
  LevelFormat, PageNumberElement, Header, Footer, TabStopType, TabStopPosition,
  PageBreak
} = require('docx');
const fs = require('fs');

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };

function cellMargins() {
  return { top: 80, bottom: 80, left: 120, right: 120 };
}

function headerCell(text, width, fill = "2C5F8A") {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill, type: ShadingType.CLEAR },
    margins: cellMargins(),
    children: [new Paragraph({
      children: [new TextRun({ text, bold: true, color: "FFFFFF", size: 22, font: "Arial" })]
    })]
  });
}

function bodyCell(text, width, fill = "FFFFFF", bold = false, color = "333333") {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill, type: ShadingType.CLEAR },
    margins: cellMargins(),
    children: [new Paragraph({
      children: [new TextRun({ text, bold, size: 20, font: "Arial", color })]
    })]
  });
}

function heading1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 200 },
    children: [new TextRun({ text, font: "Arial", size: 32, bold: true, color: "1F3A5F" })]
  });
}

function heading2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 120 },
    children: [new TextRun({ text, font: "Arial", size: 26, bold: true, color: "2C5F8A" })]
  });
}

function heading3(text) {
  return new Paragraph({
    spacing: { before: 200, after: 80 },
    children: [new TextRun({ text, font: "Arial", size: 22, bold: true, color: "2C5F8A" })]
  });
}

function body(text) {
  return new Paragraph({
    spacing: { before: 60, after: 60 },
    children: [new TextRun({ text, font: "Arial", size: 20, color: "333333" })]
  });
}

function note(text) {
  return new Paragraph({
    spacing: { before: 60, after: 120 },
    indent: { left: 360 },
    children: [
      new TextRun({ text: "Note: ", font: "Arial", size: 20, bold: true, color: "666666", italics: true }),
      new TextRun({ text, font: "Arial", size: 20, color: "666666", italics: true })
    ]
  });
}

function bullet(text, bold_prefix = null) {
  const runs = [];
  if (bold_prefix) {
    runs.push(new TextRun({ text: bold_prefix + " ", font: "Arial", size: 20, bold: true, color: "333333" }));
    runs.push(new TextRun({ text, font: "Arial", size: 20, color: "333333" }));
  } else {
    runs.push(new TextRun({ text, font: "Arial", size: 20, color: "333333" }));
  }
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { before: 40, after: 40 },
    children: runs
  });
}

function numberedStep(text, bold_prefix = null) {
  const runs = [];
  if (bold_prefix) {
    runs.push(new TextRun({ text: bold_prefix + " ", font: "Arial", size: 20, bold: true, color: "1F3A5F" }));
    runs.push(new TextRun({ text, font: "Arial", size: 20, color: "333333" }));
  } else {
    runs.push(new TextRun({ text, font: "Arial", size: 20, color: "333333" }));
  }
  return new Paragraph({
    numbering: { reference: "numbers", level: 0 },
    spacing: { before: 60, after: 60 },
    children: runs
  });
}

function codeLine(text) {
  return new Paragraph({
    spacing: { before: 40, after: 40 },
    indent: { left: 360 },
    children: [new TextRun({ text, font: "Courier New", size: 18, color: "C0392B" })]
  });
}

function divider() {
  return new Paragraph({
    spacing: { before: 200, after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC", space: 1 } },
    children: []
  });
}

function badgeParagraph(text, fill, textColor) {
  return new Paragraph({
    spacing: { before: 80, after: 80 },
    children: [
      new TextRun({ text: `  ${text}  `, font: "Arial", size: 18, bold: true, color: textColor,
        shading: { fill, type: ShadingType.CLEAR } })
    ]
  });
}

function summaryTable() {
  const col1 = 1800, col2 = 3000, col3 = 2160, col4 = 2400;
  const total = col1 + col2 + col3 + col4;
  return new Table({
    width: { size: total, type: WidthType.DXA },
    columnWidths: [col1, col2, col3, col4],
    rows: [
      new TableRow({
        children: [
          headerCell("Priority", col1),
          headerCell("Issue", col2),
          headerCell("Area", col3),
          headerCell("Impact", col4),
        ]
      }),
      new TableRow({
        children: [
          bodyCell("P0 — Today", col1, "FDECEA", true, "B71C1C"),
          bodyCell("Fix apiFetch 204 crash", col2, "FDECEA"),
          bodyCell("Frontend", col3, "FDECEA"),
          bodyCell("False error toasts on deletes", col4, "FDECEA"),
        ]
      }),
      new TableRow({
        children: [
          bodyCell("P0 — Today", col1, "FDECEA", true, "B71C1C"),
          bodyCell("Activate Next.js middleware", col2, "FDECEA"),
          bodyCell("Frontend", col3, "FDECEA"),
          bodyCell("Protected routes not enforced", col4, "FDECEA"),
        ]
      }),
      new TableRow({
        children: [
          bodyCell("P1 — This week", col1, "FFF8E1", true, "E65100"),
          bodyCell("Fix tenant case uniqueness", col2, "FFF8E1"),
          bodyCell("Backend", col3, "FFF8E1"),
          bodyCell("Duplicate org names allowed", col4, "FFF8E1"),
        ]
      }),
      new TableRow({
        children: [
          bodyCell("P1 — This week", col1, "FFF8E1", true, "E65100"),
          bodyCell("Fix role source-of-truth", col2, "FFF8E1"),
          bodyCell("Frontend", col3, "FFF8E1"),
          bodyCell("Wrong permissions shown in UI", col4, "FFF8E1"),
        ]
      }),
      new TableRow({
        children: [
          bodyCell("P1 — This week", col1, "FFF8E1", true, "E65100"),
          bodyCell("Fix task assignee filter", col2, "FFF8E1"),
          bodyCell("Both", col3, "FFF8E1"),
          bodyCell("Assignment silently fails", col4, "FFF8E1"),
        ]
      }),
      new TableRow({
        children: [
          bodyCell("P1 — This week", col1, "FFF8E1", true, "E65100"),
          bodyCell("Clarify team creator membership", col2, "FFF8E1"),
          bodyCell("Backend", col3, "FFF8E1"),
          bodyCell("Silent auto-join surprises owner", col4, "FFF8E1"),
        ]
      }),
      new TableRow({
        children: [
          bodyCell("P2 — Hardening", col1, "F3F3F3", true, "555555"),
          bodyCell("Remove token duplication", col2, "F3F3F3"),
          bodyCell("Frontend", col3, "F3F3F3"),
          bodyCell("XSS risk + auth confusion", col4, "F3F3F3"),
        ]
      }),
      new TableRow({
        children: [
          bodyCell("P2 — Hardening", col1, "F3F3F3", true, "555555"),
          bodyCell("Add @PreAuthorize to controllers", col2, "F3F3F3"),
          bodyCell("Backend", col3, "F3F3F3"),
          bodyCell("Auth regressions on new endpoints", col4, "F3F3F3"),
        ]
      }),
      new TableRow({
        children: [
          bodyCell("P2 — Hardening", col1, "F3F3F3", true, "555555"),
          bodyCell("Harden tenant scope check", col2, "F3F3F3"),
          bodyCell("Backend", col3, "F3F3F3"),
          bodyCell("Cross-tenant risk if org switching added", col4, "F3F3F3"),
        ]
      }),
    ]
  });
}

const doc = new Document({
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: "\u2022",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } }
        }]
      },
      {
        reference: "numbers",
        levels: [{
          level: 0, format: LevelFormat.DECIMAL, text: "%1.",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } }
        }]
      },
    ]
  },
  styles: {
    default: {
      document: { run: { font: "Arial", size: 20 } }
    },
    paragraphStyles: [
      {
        id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: "Arial", color: "1F3A5F" },
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 }
      },
      {
        id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, font: "Arial", color: "2C5F8A" },
        paragraph: { spacing: { before: 280, after: 120 }, outlineLevel: 1 }
      },
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      }
    },
    headers: {
      default: new Header({
        children: [
          new Paragraph({
            spacing: { after: 100 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "2C5F8A", space: 1 } },
            children: [
              new TextRun({ text: "HiveSpace — Bug Fix & Security Guide", font: "Arial", size: 18, color: "2C5F8A" }),
              new TextRun({ text: "     Internal Dev Document  |  Date: 2026-05-24", font: "Arial", size: 18, color: "999999" }),
            ]
          })
        ]
      })
    },
    footers: {
      default: new Footer({
        children: [
          new Paragraph({
            spacing: { before: 100 },
            border: { top: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC", space: 1 } },
            tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
            children: [
              new TextRun({ text: "Confidential — For internal team use only", font: "Arial", size: 16, color: "999999" }),
              new TextRun({ text: "\tPage ", font: "Arial", size: 16, color: "999999" }),
              new PageNumberElement(),
            ]
          })
        ]
      })
    },
    children: [

      // ── TITLE PAGE ────────────────────────────────────────────────
      new Paragraph({ spacing: { before: 480, after: 120 },
        children: [new TextRun({ text: "HiveSpace Project", font: "Arial", size: 48, bold: true, color: "1F3A5F" })] }),
      new Paragraph({ spacing: { before: 0, after: 80 },
        children: [new TextRun({ text: "Bug Fix & Security Remediation Guide", font: "Arial", size: 36, bold: false, color: "2C5F8A" })] }),
      new Paragraph({ spacing: { before: 0, after: 480 },
        children: [new TextRun({ text: "Step-by-step process for each identified issue  —  May 2026", font: "Arial", size: 22, color: "888888", italics: true })] }),

      divider(),

      // ── INTRO ─────────────────────────────────────────────────────
      heading1("Overview"),
      body("This document explains every issue found in the HiveSpace security and bug report, what caused it, and the exact steps to fix it. Issues are grouped into three priority phases. Fix all P0 items before working on P1 or P2."),
      new Paragraph({ spacing: { before: 120, after: 200 },
        children: [
          new TextRun({ text: "P0 = Fix today  ", font: "Arial", size: 20, bold: true, color: "B71C1C" }),
          new TextRun({ text: "P1 = Fix this week  ", font: "Arial", size: 20, bold: true, color: "E65100" }),
          new TextRun({ text: "P2 = Hardening (no active bug, but prevents future issues)", font: "Arial", size: 20, bold: true, color: "555555" }),
        ]
      }),

      // ── SUMMARY TABLE ─────────────────────────────────────────────
      heading2("Summary of All Issues"),
      new Paragraph({ spacing: { before: 80, after: 160 }, children: [] }),
      summaryTable(),

      // ── PAGE BREAK ────────────────────────────────────────────────
      new Paragraph({ children: [new PageBreak()] }),

      // ═══════════════════════════════════════════════════════════════
      heading1("P0 — Fix Today"),
      body("These two fixes stop active bugs that are already causing broken UX for users. They are both small code changes and should take less than an hour each."),

      // ── FIX 1 ─────────────────────────────────────────────────────
      heading2("Fix 1 — apiFetch crashes on 204 No Content"),

      heading3("What is the problem?"),
      body("When a user removes a team member, removes a task assignee, or removes an org member, the backend correctly returns HTTP 204 No Content (meaning: success, nothing to return). However, the frontend function apiFetch() always calls response.json() — even on a 204. Calling .json() on an empty body throws a parse error. This error is caught and shown as a red error toast, making the user think the action failed even though it actually succeeded."),

      heading3("Which files are affected?"),
      bullet("frontend/lib/api/client.ts — the apiFetch() function (root cause)"),
      bullet("frontend/lib/api/orgs.ts — removeOrganizationMember()"),
      bullet("frontend/lib/api/teams.ts — delete team member functions"),
      bullet("frontend/lib/api/tasks.ts — removeTaskAssignee()"),

      heading3("Step-by-step fix"),
      numberedStep("Open ", "Step 1:"),
      codeLine("frontend/lib/api/client.ts"),
      numberedStep("Find the apiFetch function. After the response.ok check, add this guard before calling response.json():", "Step 2:"),
      codeLine("if (response.status === 204) return null;"),
      numberedStep("Update the return type of any caller that expected a real object — change them to Promise<void> or Promise<T | null> so TypeScript does not complain.", "Step 3:"),
      numberedStep("Specifically update removeOrganizationMember, the delete-team-member function, and removeTaskAssignee so they handle a null return without crashing.", "Step 4:"),
      numberedStep("Test: as a team lead, remove a team member. Confirm no error toast appears and the member disappears from the list.", "Step 5:"),

      note("This single fix will resolve most of the 'toast error on delete' reports from the team. It is the highest-impact change in the whole report."),

      divider(),

      // ── FIX 2 ─────────────────────────────────────────────────────
      heading2("Fix 2 — Next.js auth middleware is not running"),

      heading3("What is the problem?"),
      body("The route guard that checks if a user is logged in before showing a protected page exists in a file called proxy.ts. However, Next.js only automatically runs middleware files that are named middleware.ts (in the project root or src/ folder). Because the file has the wrong name, the guard never runs and all protected routes can be visited directly without logging in."),

      heading3("Which files are affected?"),
      bullet("frontend/proxy.ts — the file with the guard logic (wrong name)"),
      bullet("Next.js requires: frontend/middleware.ts or frontend/src/middleware.ts"),

      heading3("Step-by-step fix"),
      numberedStep("Rename (or copy) frontend/proxy.ts to frontend/middleware.ts.", "Step 1:"),
      numberedStep("Open the file and make sure the main function is exported as middleware, not as a default export with a different name:", "Step 2:"),
      codeLine("export function middleware(request: NextRequest) { ... }"),
      numberedStep("Add a config export at the bottom of the file to tell Next.js which routes to protect:", "Step 3:"),
      codeLine("export const config = {"),
      codeLine("  matcher: ['/((?!login|register|_next|api).*)'],"),
      codeLine("};"),
      numberedStep("Delete the old proxy.ts file if you made a copy instead of renaming it.", "Step 4:"),
      numberedStep("Test: log out completely, then try navigating directly to /dashboard or another protected page. You should be redirected to the login page.", "Step 5:"),

      note("Until this is fixed, anyone who knows a URL can access protected pages without authenticating."),

      // ── PAGE BREAK ────────────────────────────────────────────────
      new Paragraph({ children: [new PageBreak()] }),

      // ═══════════════════════════════════════════════════════════════
      heading1("P1 — Fix This Week"),
      body("These four fixes correct functional bugs and incorrect behaviors that cause user confusion. They require slightly more code or a team decision before implementing."),

      // ── FIX 3 ─────────────────────────────────────────────────────
      heading2("Fix 3 — Tenant name uniqueness (case sensitivity)"),

      heading3("What is the problem?"),
      body("The database allows creating two organizations with names that differ only in case, such as 'Acme' and 'acme'. Postgres unique indexes are case-sensitive by default, so both pass the uniqueness check. This creates duplicate tenant records and confuses users and data."),

      heading3("Which files are affected?"),
      bullet("backend/src/main/java/com/project/hiveSpace/services/TenantService.java"),
      bullet("backend/src/main/java/com/project/hiveSpace/models/Tenant.java"),
      bullet("A new DB migration file (Flyway or Liquibase)"),

      heading3("Step-by-step fix"),
      numberedStep("In TenantService.java, normalize the slug to lowercase before saving:", "Step 1:"),
      codeLine("tenant.setSlug(slug.toLowerCase().trim());"),
      numberedStep("Optionally do the same for the name field if you want case-insensitive name uniqueness too.", "Step 2:"),
      numberedStep("Create a new DB migration file and add a functional unique index:", "Step 3:"),
      codeLine("CREATE UNIQUE INDEX uniq_tenant_slug_ci ON tenant (lower(slug));"),
      numberedStep("If Tenant.java already has a @Column(unique=true) on the slug field, decide whether to keep it (it enforces exact-case) or remove it in favor of the DB index alone. Avoid double enforcement that could conflict.", "Step 4:"),
      numberedStep("Test: create an org called 'Acme', then try to create another called 'acme'. The second should be rejected with a 409 Conflict response.", "Step 5:"),

      note("Coordinate the migration with your DBA or migration pipeline before deploying — run it in a staging environment first."),

      divider(),

      // ── FIX 4 ─────────────────────────────────────────────────────
      heading2("Fix 4 — Role source-of-truth in the frontend"),

      heading3("What is the problem?"),
      body("The hook usePermission.ts decides which UI actions to show or hide based on the user's role. When it cannot load the member list, it falls back to user.role — a field that comes from the User object and is NOT scoped to the current organization. This means a user who is an admin in one org might see admin actions in a different org where they are only a member."),

      heading3("Which files are affected?"),
      bullet("frontend/hooks/usePermission.ts — where the fallback happens"),
      bullet("frontend/store/authStore.ts — where user data is stored"),
      bullet("New file to create: frontend/hooks/useActiveMembership.ts"),

      heading3("Step-by-step fix"),
      numberedStep("Create a new hook called useActiveMembership() that calls the tenant members API and returns the current user's membership row for the active tenant.", "Step 1:"),
      numberedStep("In usePermission.ts, replace the user.role fallback with the role from useActiveMembership(). Return a loading: true state while the membership is being fetched so permission checks do not resolve to a wrong value during load.", "Step 2:"),
      numberedStep("Cache the membership result in the global store (Zustand or context) keyed by tenant ID. When the active tenant changes, invalidate and refetch.", "Step 3:"),
      numberedStep("Test: log in as a plain member (not owner or admin). Confirm admin-only buttons are hidden. Switch to an org where you are an owner. Confirm admin actions now appear.", "Step 4:"),

      divider(),

      // ── FIX 5 ─────────────────────────────────────────────────────
      heading2("Fix 5 — Task assignee requires project membership"),

      heading3("What is the problem?"),
      body("The backend (TaskAssigneeService.java) correctly requires that a user must be a project member before they can be assigned to a task in that project. However, the frontend shows all org members in the assign dropdown, not just project members. When a non-member is selected, the backend rejects it with a vague error that surfaces as a generic toast."),

      heading3("Which files are affected?"),
      bullet("Frontend: the task assignment UI component (assign member dropdown)"),
      bullet("backend/src/main/java/com/project/hiveSpace/services/TaskAssigneeService.java — error response shape"),

      heading3("Step-by-step fix"),
      numberedStep("In the task assignment UI, replace the call that fetches all org members with a call that fetches project members for the current project only.", "Step 1:"),
      numberedStep("Optional but recommended: add an 'Add to project and assign' flow. If a user picks someone not in the project, show a confirmation dialog: 'This person is not a project member. Add them to the project and assign?' Confirm adds the project member first, then assigns.", "Step 2:"),
      numberedStep("In TaskAssigneeService.java, make sure the error response when the assignee is not a project member returns HTTP 400 (not 500) with a clear message body like: Assignee must be a project member.", "Step 3:"),
      numberedStep("Test: open a task, try to assign an org member who is not in the project. They should either not appear in the dropdown, or you should see a clear explanation.", "Step 4:"),

      divider(),

      // ── FIX 6 ─────────────────────────────────────────────────────
      heading2("Fix 6 — Team creator auto-joined as member (product decision needed)"),

      heading3("What is the problem?"),
      body("When an owner creates a team and assigns a different user as the lead, the backend automatically adds the owner as a MEMBER of that team. This is implemented as a deliberate default in TeamService.createTeam(). The team considers this unexpected behavior — they did not ask to be added."),

      heading3("Which file is affected?"),
      bullet("backend/src/main/java/com/project/hiveSpace/services/TeamService.java — createTeam() method"),

      heading3("Step-by-step fix"),
      numberedStep("Discuss with the team and decide which behavior you want:", "Step 1:"),
      bullet("Option A (keep current): creator always auto-joins as member. Add a UI note in the team creation form saying 'You will be added as a member.'"),
      bullet("Option B (opt-in): add a checkbox in the create-team form: 'Add me to this team'. Only join if checked."),
      bullet("Option C (lead transfer): creator becomes lead by default; specifying another lead implies the creator is removed unless they explicitly stay."),
      numberedStep("If you choose Option B (recommended): add a boolean field addCreatorAsMember to the create-team request DTO. In TeamService.createTeam(), only insert the creator as MEMBER if this flag is true.", "Step 2:"),
      numberedStep("If you choose Option A: update the UI form to show a clear message so the behavior is not surprising.", "Step 3:"),
      numberedStep("Test: create a team with a different lead. Confirm the creator's membership matches the chosen behavior.", "Step 4:"),

      // ── PAGE BREAK ────────────────────────────────────────────────
      new Paragraph({ children: [new PageBreak()] }),

      // ═══════════════════════════════════════════════════════════════
      heading1("P2 — Hardening (Security & Maintainability)"),
      body("These three changes do not fix active user-facing bugs today, but they close security gaps and prevent the same problems from appearing again as the codebase grows."),

      // ── FIX 7 ─────────────────────────────────────────────────────
      heading2("Fix 7 — Remove duplicate JWT token storage"),

      heading3("What is the problem?"),
      body("When a user logs in, the JWT is stored in two places: localStorage AND a JavaScript-readable cookie. Neither storage is fully secure. The cookie is not HttpOnly, meaning XSS attacks can read it just like localStorage. Having two sources of truth also causes hard-to-debug bugs when one is present and the other is not (e.g. cookie exists but localStorage was cleared)."),

      heading3("Which files are affected?"),
      bullet("frontend/store/authStore.ts — where both writes happen"),
      bullet("frontend/lib/api/client.ts — reads from localStorage for Authorization header"),
      bullet("frontend/middleware.ts (after Fix 2) — reads from cookie for route guard"),

      heading3("Step-by-step fix — choose one option"),
      heading3("Option A: Header-based (simpler, keep localStorage)"),
      numberedStep("In authStore.ts, remove the line: document.cookie = 'token=...'", "Step 1:"),
      numberedStep("Update middleware.ts to check for auth state from localStorage or an in-memory signal rather than the cookie.", "Step 2:"),
      numberedStep("This is the simpler change. Note: localStorage is still vulnerable to XSS but at least you have a single source of truth.", "Step 3:"),

      heading3("Option B: Cookie-based (more secure — recommended)"),
      numberedStep("Update the Spring backend to set the JWT as an HttpOnly, Secure, SameSite=Strict cookie on login response. Remove the JWT from the JSON login response body.", "Step 1:"),
      numberedStep("In authStore.ts, remove localStorage.setItem('token', ...) and the document.cookie line.", "Step 2:"),
      numberedStep("In client.ts, remove the Authorization header injection — the browser will send the HttpOnly cookie automatically.", "Step 3:"),
      numberedStep("Update SecurityConfig.java to read the JWT from the cookie instead of the Authorization header.", "Step 4:"),
      numberedStep("Test: log in. Check DevTools Application tab. You should see the cookie marked HttpOnly (no JS access). API calls should still work without any manual Authorization header.", "Step 5:"),

      divider(),

      // ── FIX 8 ─────────────────────────────────────────────────────
      heading2("Fix 8 — Add @PreAuthorize guards to controllers"),

      heading3("What is the problem?"),
      body("Spring Security method-level security is enabled (@EnableMethodSecurity), but there is not a single @PreAuthorize annotation anywhere in the codebase. Authorization works today only because developers remember to call RbacService inside each service. When a new endpoint is added and the developer forgets this convention, there is no safety net — the endpoint will be unprotected and no tests will catch it."),

      heading3("Which files are affected?"),
      bullet("backend/src/main/java/com/project/hiveSpace/security/SecurityConfig.java — method security is already enabled"),
      bullet("backend/src/main/java/com/project/hiveSpace/security/RbacService.java — the service to call from annotations"),
      bullet("All controller files — where @PreAuthorize should be added"),

      heading3("Step-by-step fix"),
      numberedStep("Decide on a strategy: either enforce coarse role checks at the controller layer with @PreAuthorize and keep fine-grained checks in services, OR enforce everything in services and write integration tests. Mixing both (controller + service) is fine as long as it is consistent.", "Step 1:"),
      numberedStep("Start with the highest-risk endpoints. Add @PreAuthorize to controllers that handle: tenant member management, team member management, project member management, and task assignees.", "Step 2:"),
      codeLine("@PreAuthorize(\"@rbacService.hasRole(authentication, 'ADMIN')\")"),
      numberedStep("Write Spring Security integration tests for each guarded endpoint. Each test should assert: unauthenticated request gets 401, under-privileged request gets 403, authorized request succeeds.", "Step 3:"),
      numberedStep("Gradually expand coverage to all endpoints as part of normal development — add the test and annotation when you create or modify an endpoint.", "Step 4:"),

      divider(),

      // ── FIX 9 ─────────────────────────────────────────────────────
      heading2("Fix 9 — Harden tenant scope check in RbacService"),

      heading3("What is the problem?"),
      body("RbacService.verifyResourceBelongsToTenant() determines which tenant a request is scoped to by reading user.getTenant().getId() — a single pointer on the User object. The data model already supports multi-tenant membership (tenant_members rows), which means a user can belong to multiple tenants. If org switching is ever added, or if user.tenant is ever set incorrectly, the scope check can grant access to the wrong tenant's resources."),

      heading3("Which files are affected?"),
      bullet("backend/src/main/java/com/project/hiveSpace/security/RbacService.java"),
      bullet("backend/src/main/java/com/project/hiveSpace/security/JwtService.java — may need to embed tenant claim"),
      bullet("SECURITY_SCOPE_FINDINGS.md — should be updated after changes"),

      heading3("Step-by-step fix"),
      numberedStep("Pass the active tenant ID as an explicit request-level value, either as a custom request header (X-Tenant-ID) or as a claim embedded in the JWT at login time.", "Step 1:"),
      numberedStep("In RbacService.verifyResourceBelongsToTenant(), validate the tenant ID by checking that a tenant_members row exists for the current user and the provided tenant ID. Do not read user.getTenant() for scope decisions.", "Step 2:"),
      numberedStep("Remove or deprecate the reliance on user.tenant for scope resolution. Keep it only if needed for other purposes (e.g. display name).", "Step 3:"),
      numberedStep("After all changes are done, update SECURITY_SCOPE_FINDINGS.md to reflect the current state of the code. Future developers should be able to trust this document.", "Step 4:"),
      numberedStep("Test: create two tenants, add a user to both. Make a request authenticated for tenant A and try to access a resource from tenant B. It should be rejected with 403.", "Step 5:"),

      note("This does not need to be fixed before org-switching is built — but it should be fixed before or during that feature to avoid introducing a security vulnerability."),

      // ── PAGE BREAK ────────────────────────────────────────────────
      new Paragraph({ children: [new PageBreak()] }),

      // ═══════════════════════════════════════════════════════════════
      heading1("Suggested Implementation Order"),
      body("Follow this order to get the most impact with the least risk."),

      new Paragraph({ spacing: { before: 120, after: 80 },
        children: [new TextRun({ text: "Week 1 — Day 1", font: "Arial", size: 22, bold: true, color: "B71C1C" })] }),
      bullet("Fix 1: Add 204 guard in apiFetch (30 min, one line change)"),
      bullet("Fix 2: Rename proxy.ts to middleware.ts and verify matcher config (1 hour)"),

      new Paragraph({ spacing: { before: 160, after: 80 },
        children: [new TextRun({ text: "Week 1 — Days 2-5", font: "Arial", size: 22, bold: true, color: "E65100" })] }),
      bullet("Fix 4: Create useActiveMembership hook and update usePermission (half day)"),
      bullet("Fix 5: Filter task assignee list to project members (half day)"),
      bullet("Fix 6: Team discussion first, then implement chosen option (1-2 hours after decision)"),
      bullet("Fix 3: Normalize tenant slug + DB migration — coordinate with pipeline (half day)"),

      new Paragraph({ spacing: { before: 160, after: 80 },
        children: [new TextRun({ text: "Week 2+ — Hardening", font: "Arial", size: 22, bold: true, color: "555555" })] }),
      bullet("Fix 7: Decide on token storage approach, implement and test thoroughly"),
      bullet("Fix 8: Add @PreAuthorize to high-risk controllers + write integration tests"),
      bullet("Fix 9: Move tenant scope to header/JWT claim, validate via membership rows"),

      divider(),

      heading1("Testing Checklist"),
      body("After completing all fixes, run through this checklist before merging to main."),

      heading3("P0 checks"),
      bullet("Remove a team member as lead — no error toast, member disappears from list"),
      bullet("Remove an org member as owner — no error toast"),
      bullet("Remove a task assignee — no error toast"),
      bullet("Log out, navigate to /dashboard directly — redirected to login"),

      heading3("P1 checks"),
      bullet("Create org 'Acme', try to create 'acme' — second creation rejected"),
      bullet("Log in as member, confirm no admin-only actions visible"),
      bullet("Switch org to one where you are admin — admin actions appear"),
      bullet("Try to assign a non-project member to a task — clear error or filtered dropdown"),
      bullet("Create a team with another lead — creator's membership matches expected behavior"),

      heading3("P2 checks"),
      bullet("After Fix 7: check DevTools — JWT stored in exactly one place"),
      bullet("After Fix 8: unauthenticated request to protected endpoint returns 401"),
      bullet("After Fix 8: member-role user calling admin endpoint returns 403"),
      bullet("After Fix 9: user with tenant A token cannot access tenant B resources"),

      new Paragraph({ spacing: { before: 400, after: 100 },
        children: [new TextRun({ text: "Document prepared by: Code Review Analysis  |  Repo: D:\\hiveSpace  |  2026-05-24", font: "Arial", size: 18, color: "AAAAAA", italics: true })] }),
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("/mnt/user-data/outputs/HiveSpace_Fix_Guide.docx", buffer);
  console.log("Done: HiveSpace_Fix_Guide.docx");
});