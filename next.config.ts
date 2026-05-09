import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactCompiler: true,
  allowedDevOrigins: ["localhost", "172.16.2.51"],
};

export default nextConfig;
