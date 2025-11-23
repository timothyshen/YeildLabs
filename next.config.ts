import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['pino', 'thread-stream', 'pino-pretty', 'lokijs', 'encoding'],
};

export default nextConfig;
