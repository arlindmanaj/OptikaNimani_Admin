import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@libsql/client"],
  webpack(config, { webpack }) {
    config.plugins.push(new webpack.NormalModuleReplacementPlugin(/^cloudflare:workers$/, path.resolve(process.cwd(), "lib/vercel-runtime.ts")));
    return config;
  },
};

export default nextConfig;
