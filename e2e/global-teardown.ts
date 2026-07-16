import { unlinkSync } from "node:fs";
import { storageStatePaths } from "./helpers/auth-paths";
import { qaProfileCachePaths } from "./helpers/qa-profiles";

export default async function globalTeardown(): Promise<void> {
  for (const filePath of [...storageStatePaths, ...qaProfileCachePaths]) {
    try {
      unlinkSync(filePath);
    } catch {
      // Ignore missing files.
    }
  }
}
