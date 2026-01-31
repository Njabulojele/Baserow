import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  serverExternalPackages: ["pg", "@prisma/client"],

  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
