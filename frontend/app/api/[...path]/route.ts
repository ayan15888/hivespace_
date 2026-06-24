import { NextRequest, NextResponse } from "next/server";

const backendBase = (process.env.BACKEND_URL || "http://127.0.0.1:8080").replace(
  /\/$/,
  "",
);

/** Build upstream headers so `Authorization` always reaches Spring (avoid cloning quirks). */
function buildUpstreamHeaders(request: NextRequest): Headers {
  const out = new Headers();
  const auth =
    request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (auth) {
    const trimmed = auth.trim();
    out.set(
      "Authorization",
      /^Bearer\s+/i.test(trimmed) ? trimmed : `Bearer ${trimmed}`,
    );
  }
  const ct =
    request.headers.get("content-type") ?? request.headers.get("Content-Type");
  if (ct) {
    out.set("Content-Type", ct);
  }
  const accept = request.headers.get("accept") ?? request.headers.get("Accept");
  if (accept) {
    out.set("Accept", accept);
  }
  const tenantId = request.headers.get("x-tenant-id") ?? request.headers.get("X-Tenant-Id");
  if (tenantId) {
    out.set("X-Tenant-Id", tenantId);
  }
  return out;
}

async function proxy(request: NextRequest, pathSegments: string[]) {
  const path = pathSegments.join("/");
  const search = request.nextUrl.search;
  const url = `${backendBase}/api/${path}${search}`;

  const method = request.method;
  const hasBody = !["GET", "HEAD", "OPTIONS", "TRACE"].includes(method);
  const body = hasBody ? await request.arrayBuffer() : undefined;

  const upstream = await fetch(url, {
    method,
    headers: buildUpstreamHeaders(request),
    body,
    cache: "no-store",
  });

  const resHeaders = new Headers(upstream.headers);
  resHeaders.delete("transfer-encoding");

  if (upstream.headers.get("content-type")?.includes("text/event-stream")) {
    return new NextResponse(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: resHeaders,
    });
  }

  const resBody = await upstream.arrayBuffer();
  return new NextResponse(resBody, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: resHeaders,
  });
}

type RouteContext = { params: Promise<{ path: string[] }> };

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, ctx: RouteContext) {
  const { path } = await ctx.params;
  return proxy(request, path);
}

export async function POST(request: NextRequest, ctx: RouteContext) {
  const { path } = await ctx.params;
  return proxy(request, path);
}

export async function PUT(request: NextRequest, ctx: RouteContext) {
  const { path } = await ctx.params;
  return proxy(request, path);
}

export async function PATCH(request: NextRequest, ctx: RouteContext) {
  const { path } = await ctx.params;
  return proxy(request, path);
}

export async function DELETE(request: NextRequest, ctx: RouteContext) {
  const { path } = await ctx.params;
  return proxy(request, path);
}

export async function OPTIONS(request: NextRequest, ctx: RouteContext) {
  const { path } = await ctx.params;
  return proxy(request, path);
}
