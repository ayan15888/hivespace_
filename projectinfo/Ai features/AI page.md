HiveSpace /dashboard/ai Page Redesign

Context
You are redesigning the /dashboard/ai page of HiveSpace, a project management SaaS tool with a dark theme (near-black backgrounds, indigo/violet accents). The current page has a hero section, six feature cards, and a broken chat that returns the same response every time. Replace the entire page with a clean, conversation-focused AI assistant UI that matches the polish of Claude.ai or ChatGPT. Do not touch any other page.

Layout & States
The page has two distinct states that must transition smoothly between each other.
State 1 — Empty / New Conversation
Render a vertically and horizontally centered layout. No hero text, no feature cards, no stats widgets. Show only:

A small wordmark or label at the top center, something minimal like "Hex AI" with a subtle spark icon
A large, rounded textarea input box centered on screen (similar width to Claude.ai's input, roughly 680px max-width)
A row of 4–5 quick action pill buttons below the input (not cards). Labels: "Generate tasks", "Triage backlog", "Sprint retro", "Summarize channel", "Find duplicates"
Placeholder text inside the input: "Ask anything across your workspace..."

State 2 — Active Conversation
Once the user sends their first message:

Animate the input box from the center of the screen down to a fixed bottom bar using a smooth CSS transition (transform + opacity, ~300ms ease-in-out)
The messages area fades in above, scrollable, with the most recent message at the bottom
User messages right-aligned, AI messages left-aligned with the Hex AI spark icon avatar
The quick action pills disappear during active conversation
Bottom input bar should have a subtle top border and slight blur/frosted glass effect on the background


Chat History Sidebar

Add a collapsible sidebar on the LEFT side of the chat area (not the main app sidebar — this is an inner sidebar scoped to the AI page only)
Default state: collapsed, showing only a thin strip with a toggle icon (hamburger or panel icon)
Expanded state: slides in smoothly (CSS transform translateX, ~250ms), width ~260px, shows list of past conversation titles grouped by date (Today, Yesterday, Last 7 days)
Each history item shows the first line of the conversation as the title, truncated
A "New chat" button pinned at the top of the sidebar
Clicking a history item loads that conversation into the main area
Sidebar should be collapsible via a button both inside the sidebar header and in the main chat header
On mobile, the sidebar becomes a full-width drawer overlay with a backdrop


Design Tokens — match HiveSpace's existing dark theme
Background:        #0f0f10  (main canvas)
Surface:           #1a1a1f  (input box, sidebar, message bubbles)
Border:            #2a2a35
Accent:            #7c6af7  (indigo-violet, for send button, active states, user message bubble left border)
Text primary:      #e8e8f0
Text muted:        #6b6b80
AI message bg:     #1e1e28
User message bg:   #252535
Input bg:          #1a1a1f
Font: inherit whatever the app already uses (likely Inter or similar sans-serif).

Animations

Input centering → bottom transition: transform: translateY() + transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1)
Messages fade in: opacity 0 → 1 over 200ms with a slight translateY(8px → 0) per message
Sidebar slide: transform: translateX(-100%) → translateX(0) over 250ms ease
Quick action pills fade out: opacity 1 → 0 over 150ms when first message is sent
Respect prefers-reduced-motion — skip transforms, keep opacity-only transitions


Component Structure (if React)
<AIDashboardPage>
  <HistorySidebar collapsed={bool} onToggle={fn} conversations={[]} />
  <MainArea>
    <ChatHeader onToggleSidebar={fn} conversationTitle={string} />
    {!hasStarted ? (
      <EmptyState onSubmit={fn} />        // centered input + pills
    ) : (
      <ActiveChat messages={[]} />        // scrollable messages
    )}
    <InputBar onSend={fn} isActive={hasStarted} />
  </MainArea>
</AIDashboardPage>

Behavior Details

The input box in EmptyState and the InputBar at the bottom are the SAME component that repositions — do not mount/unmount two separate inputs, as this loses focus and state
Auto-focus the input on page load
Send on Enter, new line on Shift+Enter
Show a loading indicator (three animated dots) in an AI message bubble while awaiting response
The InputBar in active state should auto-grow with content up to 5 lines, then scroll internally
If the user clicks a quick action pill, pre-fill the input with that action's text and focus the cursor at the end


What NOT to include

No hero section, no "How can I help today?" heading
No six feature cards grid
No workspace stats widgets (Recent Tasks, Live Context panels) on this page
No full-page sidebar replacement — the existing app sidebar stays untouched; this is only an inner layout change within the page content area


Acceptance Criteria

On load, input is centered, page feels like Claude.ai / ChatGPT new chat screen
After first message send, input animates to bottom in under 350ms with no layout jump
History sidebar opens and closes smoothly without pushing main content abruptly
All transitions respect prefers-reduced-motion
Layout is usable on screens as narrow as 375px (mobile)
No regressions on any other dashboard page