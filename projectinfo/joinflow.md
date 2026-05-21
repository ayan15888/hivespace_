The Onboarding Join Flow
When the user selects "Join an Organization" on the onboarding screen, show them two fields:
Invite Link:  [paste your invite link here]
PIN:          [6-digit PIN]
That is it. Nothing else. The invite link contains the token already embedded in the URL. Your frontend parses the token out of the pasted link, pairs it with the PIN they type, and calls the same endpoint you already built.

The Exact Flow Step by Step
Step 1 — User pastes the invite link
They received something like hivespace.app/invite/acmecorp/abc123xyz from their admin via WhatsApp or email. They paste the full URL into the input field. Your frontend immediately parses the token from the URL client-side:
typescriptfunction extractTokenFromLink(link: string): string | null {
  try {
    const url = new URL(link)
    const segments = url.pathname.split('/').filter(Boolean)
    // pathname: /invite/acmecorp/abc123xyz
    // segments: ['invite', 'acmecorp', 'abc123xyz']
    if (segments[0] === 'invite' && segments.length === 3) {
      return segments[2] // the token
    }
    return null
  } catch {
    return null
  }
}
As soon as a valid token is parsed, call your validate endpoint silently in the background:
GET /api/invites/validate?token=abc123xyz&orgSlug=acmecorp
This returns the org name and role being offered. Show it as a confirmation below the input field — something like "You are joining Acme Corp as a Member." This builds trust before the user commits.
Step 2 — User enters the PIN
Simple 6-digit input. Can be individual digit boxes like OTP inputs for better UX — ShadCN has an InputOTP component that handles this.
Step 3 — Submit
Call POST /api/i/join with { token, pin }. Your backend validates everything, creates the membership, and returns the user's new workspace context.
Step 4 — Redirect
On success, redirect directly to dashboard inside the org they just joined. Skip the rest of onboarding — they are already in an org.

What If They Just Have a Token Not a Full Link
Some admins might share just the raw token instead of the full URL. Handle this gracefully — if what they paste does not look like a URL, treat the entire pasted string as the token directly:
typescriptfunction parseInviteInput(input: string): { token: string, orgSlug?: string } | null {
  const trimmed = input.trim()
  
  // Try parsing as a full URL first
  try {
    const url = new URL(trimmed)
    const segments = url.pathname.split('/').filter(Boolean)
    if (segments[0] === 'invite' && segments.length === 3) {
      return { token: segments[2], orgSlug: segments[1] }
    }
  } catch {
    // Not a URL — treat as raw token
    if (trimmed.length > 10) {
      return { token: trimmed }
    }
  }
  
  return null
}

Onboarding Page Structure
┌─────────────────────────────────────┐
│  Welcome to Hivespace                │
│                                     │
│  How would you like to get started? │
│                                     │
│  ┌─────────────┐  ┌──────────────┐  │
│  │ Create an   │  │ Join an      │  │
│  │ Organization│  │ Organization │  │
│  └─────────────┘  └──────────────┘  │
└─────────────────────────────────────┘
When "Join an Organization" is selected the form expands inline — no navigation, no new page:
┌─────────────────────────────────────┐
│  Join an Organization               │
│                                     │
│  Invite Link                        │
│  [hivespace.app/invite/acmecorp/...] │
│                                     │
│  ✓ You are joining Acme Corp        │
│    as a Member                      │
│                                     │
│  PIN                                │
│  [○][○][○][○][○][○]                 │
│                                     │
│  [Join Organization]                │
└─────────────────────────────────────┘
The org name confirmation appears as soon as the token is validated — before the user types the PIN. This is important because it prevents accidentally joining the wrong org.

One Edge Case To Handle
A user might click the invite link directly from WhatsApp or their email instead of going through onboarding. In that case they land on app/(public)/invite/[orgSlug]/[token]/page.tsx. If they are not logged in yet, this page should save the token and orgSlug to sessionStorage and redirect them to signup. After registration completes, read from sessionStorage, auto-fill the join form, and complete the flow. This way clicking a link and signing up feels seamless — they never have to paste the link manually.
typescript// On invite page, if not logged in
sessionStorage.setItem('pendingInviteToken', token)
sessionStorage.setItem('pendingInviteOrgSlug', orgSlug)
router.push('/signup?redirect=invite')

// After signup completes, in onboarding
const pendingToken = sessionStorage.getItem('pendingInviteToken')
if (pendingToken) {
  // Skip the choice screen, go straight to join flow with pre-filled token
  sessionStorage.removeItem('pendingInviteToken')
  sessionStorage.removeItem('pendingInviteOrgSlug')
}
This covers both entry points — direct link click and manual paste during onboarding — with the same underlying invite system you already have.