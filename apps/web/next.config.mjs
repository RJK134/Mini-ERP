/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
  },
  transpilePackages: [
    "@ops-hub/db",
    "@ops-hub/ui",
    "@ops-hub/prompts",
    "@ops-hub/workflows",
  ],
};

export default nextConfig;
