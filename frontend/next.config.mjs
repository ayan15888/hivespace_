/** @type {import('next').NextConfig} */
/**
 * API traffic to Spring is proxied by `app/api/[...path]/route.ts` so headers like
 * `Authorization` are forwarded reliably (Next rewrites can omit them in dev).
 */
const nextConfig = {
  devIndicators: {
    appIsrStatus: false,
    buildActivity: false,
  },
  // Keep a single ProseMirror copy in the bundle (Tiptap + nested deps).
  transpilePackages: [
    "@tiptap/react",
    "@tiptap/core",
    "@tiptap/starter-kit",
    "@tiptap/pm",
  ],
};

export default nextConfig;