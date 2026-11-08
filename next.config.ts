import type { NextConfig } from "next";

// Static export: the app has no server code. Files are parsed in the browser.
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  // The project folder is the root, even if a parent folder has its own package-lock.json.
  turbopack: { root: process.cwd() },
};

export default nextConfig;
