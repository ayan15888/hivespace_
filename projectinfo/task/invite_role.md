Yes, Allow Role Selection — But With Restrictions
The "Invite As" dropdown should not be hardcoded to Member. The inviter should be able to choose, but what they can choose depends on their own role. This is the rule:
If the inviter is Org Owner:
Dropdown shows: Admin, Billing Admin, Member
If the inviter is Org Admin:
Dropdown shows: Billing Admin, Member
Cannot assign: Admin (only Owner can create Admins)
Cannot assign: Owner (only one, never reassignable)
This means the dropdown options are dynamically filtered based on who is sending the invite. Your frontend fetches the current user's tenant role and renders the appropriate options. Your backend also validates this on POST /api/invites — if an Admin tries to create an invite with role ADMIN, reject it with 403.

The Email Field
Your UI shows "Add email addresses" at the top. Since you have no email infrastructure yet, either hide this field entirely for now and only show the link + PIN, or keep it visible but disabled with a tooltip saying "Email invites coming soon." Don't remove the UI permanently — you will want it when you have a domain and Resend set up.

The "Add to Workspace" Section
This is smart UX — inviting someone to the org and a workspace in one step. The current workspace shows as locked (Engineering — current) which is correct. The others are optional checkboxes.
Underneath this maps to your backend creating multiple records in one transaction:
1. Create tenant_members row (always)
2. Create workspace_members row for each checked workspace (optional)
This is clean and your schema already supports it perfectly.

The "Add to Team" Section
Same pattern — optional, creates team_members rows. One important thing to enforce here — only show teams that belong to the selected workspaces. If the user unchecks Engineering workspace, Backend Team and Frontend Team should disappear from the team list since those teams belong to Engineering.

What to Change in the UI
Only two things:
1. Make the "Invite As" dropdown dynamic based on inviter's role as described above. Remove the hardcoded Member default — or keep Member as the default value but allow changing it.
2. Add a description line under each role option so the inviter understands what they are assigning. Your current UI already does this well — "Can be assigned tasks, join channels, edit docs" under Member. Do the same for Admin and Billing Admin:
Admin         — Full org access, can manage members and settings
Billing Admin — Billing and invoices only, no access to projects or teams  
Member        — Can be assigned tasks, join channels, edit docs
Everything else in this UI is correct and well thought out. The layout, the PIN display, the workspace/team selection, the Generate Link button — all good as-is.