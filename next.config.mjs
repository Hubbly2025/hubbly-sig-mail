/** @type {import('next').NextConfig} */
const nextConfig = {
  // Served at /mail on the Signal and ClickRabbit domains (Vercel multi-zones rewrite).
  basePath: "/mail",
  reactStrictMode: true,
};

export default nextConfig;
