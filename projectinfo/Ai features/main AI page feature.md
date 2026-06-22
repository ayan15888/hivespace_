1. The big search box at the top ("How can I help today?")
This is the main chat box. User types a question like "why did we choose REST over GraphQL" and the AI should answer using:

The project's docs (your RAG pipeline)
Recent tasks
Recent chat messages

It's basically a smarter version of the /ai ask you built for channels — but for the whole project, not just one channel.

2. The 6 buttons (Generate tasks, Semantic search, Review PR, Sprint retrospective, Smart triage, Draft document)
Each one is a different job for the AI:

Generate tasks → User pastes a paragraph (like a feature idea) → AI turns it into a list of tasks → user clicks "create" → tasks get added to the board.
Semantic search → User types something → AI finds matching docs/tasks/messages and shows them. No AI writing, just AI finding.
Review PR → Skip this one for now. You haven't built GitHub integration, so this button should be hidden or say "coming soon."
Sprint retrospective → User picks a date range → AI looks at what got done, what got stuck, and what was discussed in chat → writes a summary doc automatically.
Smart triage → AI looks at all your tasks and suggests changes (like "this task should be High priority since it's due tomorrow") → shows you the suggestions → you approve or reject them → only then do they actually change.
Draft document → User types a one-line idea → AI writes a full document → saves it so the user can edit.


3. The side panel (Recent Tasks, Recent Docs)
This doesn't need AI. It's just there to show the user "this is what the AI can see" before they ask it something — so they trust the answer is based on real, current data.

Bottom line — what to build next, in order:

Semantic search — easiest, just search, no AI writing involved
The main chat box — your core RAG feature
Generate tasks — you already know how to do this from earlier
Smart triage and Sprint retrospective — these are the harder, multi-step ones, do them last
Hide the "Review PR" button for now since it's not real yet

On Your Redundancy Concern — You're Right to Question It
This is a real architectural smell worth taking seriously, not dismissing. Here's the actual problem: you already have a dedicated Kanban/task page, a dedicated Docs page, and a dedicated Chat page. Each of those is the natural home for its own actions — "create task" belongs on the task board, "write a doc" belongs in the docs editor, "ask about this conversation" belongs in chat.
If the AI page is just a second front door to the same actions those pages already do, then yes, it's redundant — it's not a feature, it's a UI duplication problem. A user shouldn't have to think "do I go to the task board to create a task, or the AI page?"
The fix isn't to cut the AI page — it's to be precise about what makes it non-redundant. The AI page earns its place only for things that genuinely don't have a home anywhere else:

Project-wide chat/search — genuinely unique, no other page lets you ask a cross-document, cross-task, cross-channel question
Smart Triage — genuinely unique, no other page evaluates your entire backlog and proposes batch changes
Sprint Retrospective — genuinely unique, no other page synthesizes a multi-source report

But Generate Tasks and Draft Document are exactly the redundancy you're sensing. "Paste a brief, get tasks" should probably be a button inside the task board page ("Import from brief"), not a separate destination. Same with Draft Document — that belongs as a "New from AI prompt" option inside the Docs page, not a standalone card on a different page entirely.
The honest reframe: the AI page shouldn't be "AI does everything," it should be "the AI capabilities that don't belong anywhere else" — chat, search, triage, retro. Everything else should be an AI-powered button embedded inside the page it naturally belongs to.