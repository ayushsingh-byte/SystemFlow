import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Transpile reactflow and its dependencies
  transpilePackages: ['reactflow', '@reactflow/core', '@reactflow/background', '@reactflow/controls', '@reactflow/minimap'],
};

export default nextConfig;
