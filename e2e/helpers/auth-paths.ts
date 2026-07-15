import path from "node:path";

export const AUTH_DIR = path.join("test-results", ".auth");

export const plannerStoragePath = path.join(AUTH_DIR, "planner.json");
export const djStoragePath = path.join(AUTH_DIR, "dj.json");
export const bothStoragePath = path.join(AUTH_DIR, "both.json");

export const storageStatePaths = [
  plannerStoragePath,
  djStoragePath,
  bothStoragePath,
] as const;
