import fs from "node:fs";
import path from "node:path";

export type ScriptConflict = {
  name: string;
  current: string;
  proposed: string;
};

/**
 * Finds package.json scripts that already exist with a different command.
 * Scripts whose current value equals the proposal are not conflicts.
 */
export function findScriptConflicts(
  existing: Record<string, string> | undefined,
  proposed: Record<string, string>,
): ScriptConflict[] {
  const conflicts: ScriptConflict[] = [];
  for (const [name, command] of Object.entries(proposed)) {
    const current = existing?.[name];
    if (current !== undefined && current !== command) {
      conflicts.push({ name, current, proposed: command });
    }
  }
  return conflicts;
}

/** Which of the planned files already exist in the project. */
export function findExistingFiles(projectRoot: string, plannedFiles: string[]): string[] {
  return plannedFiles.filter((relative) => fs.existsSync(path.join(projectRoot, relative)));
}
