import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pg", "@prisma/client"],

  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
