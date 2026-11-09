import { readFileSync } from "node:fs";
import type { NextConfig } from "next";

/** The app version, major.minor, from package.json. Only the minor part goes up with each update. */
const { version } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as { version: string };
const appVersion = version.split(".").slice(0, 2).join(".");

// Static export: the app has no server code. Files are parsed in the browser.
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_APP_VERSION: appVersion },
  // The project folder is the root, even if a parent folder has its own package-lock.json.
  turbopack: { root: process.cwd() },
};

export default nextConfig;
