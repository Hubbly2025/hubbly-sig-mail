/** @type {import('next').NextConfig} */
const nextConfig = {
  // Served at /mail on the Signal and ClickRabbit domains (Vercel multi-zones rewrite).
  // Gated on an env var so the v0 preview can serve routes from the root (/campaigns
  // instead of /mail/campaigns). Set MAIL_BASE_PATH="/mail" in production to restore it.
  ...(process.env.MAIL_BASE_PATH ? { basePath: process.env.MAIL_BASE_PATH } : {}),
  reactStrictMode: true,
};

export default nextConfig;
