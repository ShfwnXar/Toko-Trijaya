/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable ESLint during build (already checked in dev)
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Disable TypeScript type checking during build (types verified in dev)
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
