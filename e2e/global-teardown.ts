import { unlinkSync } from "node:fs";
import { storageStatePaths } from "./helpers/auth-paths";

export default async function globalTeardown(): Promise<void> {
  for (const filePath of storageStatePaths) {
    try {
      unlinkSync(filePath);
    } catch {
      // Ignore missing files.
    }
  }
}
