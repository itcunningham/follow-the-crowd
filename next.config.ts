import type { NextConfig } from "next";
import packageJson from "./package.json";

/** Vercel sets VERCEL_GIT_COMMIT_SHA at build time; never expose other env vars to the client. */
function resolveFtcBuildId(): string {
  const vercelSha = process.env.VERCEL_GIT_COMMIT_SHA?.trim();
  if (vercelSha && /^[a-f0-9]+$/i.test(vercelSha)) {
    return vercelSha.slice(0, 7).toLowerCase();
  }
  return "Local";
}

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_FTC_APP_VERSION: packageJson.version,
    NEXT_PUBLIC_FTC_BUILD_ID: resolveFtcBuildId(),
  },
};

export default nextConfig;
