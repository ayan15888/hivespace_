Batch 5 — Fix Org Switching and Route Protection
frontend/middleware.ts — create this file:
typescriptimport { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('hivespace_token')?.value
  const isAuthRoute = request.nextUrl.pathname.startsWith('/dashboard') ||
                      request.nextUrl.pathname.startsWith('/settings') ||
                      request.nextUrl.pathname.startsWith('/account')
  const isOnboarding = request.nextUrl.pathname.startsWith('/onboarding')

  if (isAuthRoute && !token) {
    return NextResponse.redirect(new URL('/signin', request.url))
  }

  if (token && (
    request.nextUrl.pathname === '/signin' ||
    request.nextUrl.pathname === '/signup'
  )) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)']
}
frontend/components/layout/NavRail.tsx — org switching:
Until the backend switch-tenant endpoint is built, disable org switching with a clear tooltip:
typescript// Disable org switching until backend tenant-switch is supported
<Tooltip content="Switching organizations coming soon">
  <Button disabled={true} onClick={undefined}>
    {activeOrg.name}
  </Button>
</Tooltip>
Do not let the user switch orgs client-side only — it will cause silent 403 errors everywhere because the backend JWT still points to the original tenant.