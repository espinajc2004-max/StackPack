import fs from "node:fs/promises";
import path from "node:path";
import { resolveInsideRoot } from "./safe-paths.js";

const NEVER_BACKED_UP = ["node_modules", "dist", "build", "coverage", ".git"];

function isBackupExcluded(relativePath: string): boolean {
  const first = relativePath.replaceAll("\\", "/").split("/")[0] ?? "";
  return NEVER_BACKED_UP.includes(first);
}

/**
 * Copies existing files (relative to the project root) into the operation's
 * backup directory, preserving relative structure. Missing files are skipped.
 * Returns the list of files that were actually backed up.
 */
export async function backupFiles(
  projectRoot: string,
  backupFilesDir: string,
  relativeFiles: string[],
): Promise<string[]> {
  const backedUp: string[] = [];
  for (const relative of relativeFiles) {
    if (isBackupExcluded(relative)) continue;
    const source = resolveInsideRoot(projectRoot, relative);
    try {
      await fs.access(source);
    } catch {
      continue;
    }
    const target = path.join(backupFilesDir, relative);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.copyFile(source, target);
    backedUp.push(relative);
  }
  return backedUp;
}

/** Restores every backed-up file to its original location. Best effort. */
export async function restoreBackup(
  projectRoot: string,
  backupFilesDir: string,
): Promise<string[]> {
  const restored: string[] = [];
  const entries = await fs.readdir(backupFilesDir, { recursive: true, withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const absolute = path.join(entry.parentPath ?? backupFilesDir, entry.name);
    const relative = path.relative(backupFilesDir, absolute);
    const target = resolveInsideRoot(projectRoot, relative);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.copyFile(absolute, target);
    restored.push(relative.replaceAll("\\", "/"));
  }
  return restored;
}
