import type { NextConfig } from "next";

const deploymentId = process.env.DEPLOYMENT_ID;

const nextConfig = {
  output: "standalone",
  headers: async () => deploymentId ? [{ source: "/:path*", headers: [{ key: "x-deployment-id", value: deploymentId }] }] : [],
} satisfies NextConfig;

export default nextConfig;
