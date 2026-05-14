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
};

export default nextConfig;