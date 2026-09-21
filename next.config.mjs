/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  async headers() {
    const securityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "no-referrer" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=()",
      },
      { key: "X-Frame-Options", value: "DENY" },
    ];
    return [
      {
        // HTML 页面：禁止 CDN 共享缓存长缓存旧页面（避免 Cloudflare/nginx 缓存一年旧 HTML），
        // 用正则排除 /_next/ 静态资源（那些走 Next 内置 immutable 缓存），
        // 只对页面本身生效。
        source: "/:path((?!_next/).*)",
        headers: [
          ...securityHeaders,
          {
            key: "Cache-Control",
            value: "no-store, max-age=0",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
