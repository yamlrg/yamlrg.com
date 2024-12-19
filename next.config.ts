import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    PORT: process.env.PORT || '3000'
  }
};

export default nextConfig;
