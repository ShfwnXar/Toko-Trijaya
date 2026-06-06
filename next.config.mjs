/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable ESLint during build (already checked in dev)
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Disable TypeScript type checking during build (already checked in dev)
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
