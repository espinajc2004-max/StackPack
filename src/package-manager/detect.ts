import fs from "node:fs";
import path from "node:path";
import type { PackageManager } from "./types.js";

const LOCKFILES: Array<[string, PackageManager]> = [
  ["package-lock.json", "npm"],
  ["pnpm-lock.yaml", "pnpm"],
  ["yarn.lock", "yarn"],
  ["bun.lock", "bun"],
  ["bun.lockb", "bun"],
];

/**
 * Detects package managers from lockfiles in the project root.
 * Returns every distinct match; more than one means the project is ambiguous
 * and the user must choose.
 */
export function detectPackageManagers(projectRoot: string): PackageManager[] {
  const found: PackageManager[] = [];
  for (const [lockfile, manager] of LOCKFILES) {
    if (fs.existsSync(path.join(projectRoot, lockfile)) && !found.includes(manager)) {
      found.push(manager);
    }
  }
  return found;
}
