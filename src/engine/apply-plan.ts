import fs from "node:fs/promises";
import path from "node:path";
import { applyEdits, modify, parse as parseJsonc } from "jsonc-parser";
import type { InstallationPlan } from "./build-plan.js";
import { detectProject } from "./detect-project.js";
import type { ProjectContext } from "../schemas/project-context.js";
import { packageInstallCommand } from "../package-manager/commands.js";
import { formatCommand, type CommandDefinition } from "../package-manager/types.js";
import type { CommandRunner } from "../package-manager/execute.js";
import { backupFiles } from "../project/backups.js";
import { resolveInsideRoot } from "../project/safe-paths.js";
import { updatePackageJsonScripts } from "../project/package-json.js";
import {
  createOperation,
  writeOperationSummary,
  type Operation,
} from "../storage/operation-store.js";
import { StackPackError } from "../utils/errors.js";

export type FileConflictResolution = "keep" | "replace" | "rename";
export type ScriptConflictResolution = "replace" | "alternate" | "skip";

export type ApplyOptions = {
  dryRun: boolean;
  runner: CommandRunner;
  /** Decisions collected at review time, keyed by planned file path. */
  fileResolutions?: Record<string, FileConflictResolution>;
  /** Decisions collected at review time, keyed by script name. */
  scriptResolutions?: Record<string, ScriptConflictResolution>;
  /** Progress callback for the UI. */
  onProgress?: (message: string) => void;
};

export type ApplyResult = {
  dryRun: boolean;
  commandsRun: string[];
  createdFiles: string[];
  skippedFiles: string[];
  modifiedFiles: string[];
  notes: string[];
  operationDir?: string;
  refreshedContext?: ProjectContext;
};

function renameWithSuffix(filePath: string): string {
  const ext = path.extname(filePath);
  return ext.length > 0
    ? `${filePath.slice(0, -ext.length)}.stackpack${ext}`
    : `${filePath}.stackpack`;
}

async function runOrThrow(
  runner: CommandRunner,
  cmd: CommandDefinition,
  what: string,
  commandsRun: string[],
): Promise<void> {
  commandsRun.push(formatCommand(cmd));
  const result = await runner(cmd);
  if (result.exitCode !== 0) {
    const stderrTail = result.stderr.split("\n").slice(-15).join("\n").trim();
    throw new StackPackError(`${what} failed with exit code ${result.exitCode}.`, {
      hints: [
        `Command: ${formatCommand(cmd)}`,
        ...(stderrTail.length > 0 ? [stderrTail] : []),
        "The project may contain partial changes; a backup was created before installation.",
      ],
    });
  }
}

/**
 * Applies a reviewed installation plan using the safe execution flow:
 * backups -> official package installs -> StackPack file changes and JSON
 * edits -> official initializers -> rescan -> package.json script updates.
 * Files come before initializers because official CLIs (e.g. shadcn)
 * validate prerequisites like Tailwind config and import aliases.
 */
export async function applyPlan(
  plan: InstallationPlan,
  options: ApplyOptions,
): Promise<ApplyResult> {
  if (plan.conflicts.length > 0) {
    throw new StackPackError("Unresolved dependency conflicts block installation.", {
      hints: plan.conflicts.map((c) => c.message),
    });
  }

  const progress = options.onProgress ?? (() => {});
  const root = plan.context.rootDirectory;
  const pm = plan.context.packageManager;
  const result: ApplyResult = {
    dryRun: options.dryRun,
    commandsRun: [],
    createdFiles: [],
    skippedFiles: [],
    modifiedFiles: [],
    notes: [...plan.notes],
  };

  const dependencyInstall =
    plan.dependencies.length > 0
      ? packageInstallCommand(
          pm,
          plan.dependencies.map((p) => ({ name: p.name, version: p.resolvedVersion })),
          { dev: false, cwd: root },
        )
      : null;
  const devDependencyInstall =
    plan.devDependencies.length > 0
      ? packageInstallCommand(
          pm,
          plan.devDependencies.map((p) => ({ name: p.name, version: p.resolvedVersion })),
          { dev: true, cwd: root },
        )
      : null;

  if (options.dryRun) {
    for (const cmd of [dependencyInstall, devDependencyInstall]) {
      if (cmd) result.commandsRun.push(formatCommand(cmd));
    }
    for (const entry of plan.initializers) {
      result.commandsRun.push(formatCommand(entry.initializer.buildCommand(pm, root)));
    }
    result.createdFiles = plan.filesToCreate.map((f) => f.path);
    result.modifiedFiles = plan.filesToModify;
    result.notes.push("Dry run: no commands were executed and no files were changed.");
    return result;
  }

  const operation: Operation = await createOperation(root);
  result.operationDir = operation.dir;
  const filesBackedUp = await backupFiles(root, operation.filesDir, [
    "package.json",
    ...plan.filesToModify,
    ...plan.existingFileConflicts,
  ]);
  const summaryBase = {
    operationId: operation.id,
    startedAt: new Date().toISOString(),
    integrations: plan.integrations.map((i) => i.recipe.id),
    filesBackedUp,
    commandsRun: result.commandsRun,
  };
  await writeOperationSummary(operation, { ...summaryBase, status: "started" });

  try {
    if (dependencyInstall) {
      progress(`Installing dependencies with ${pm}...`);
      await runOrThrow(
        options.runner,
        dependencyInstall,
        "Package installation",
        result.commandsRun,
      );
    }
    if (devDependencyInstall) {
      progress(`Installing development dependencies with ${pm}...`);
      await runOrThrow(
        options.runner,
        devDependencyInstall,
        "Development package installation",
        result.commandsRun,
      );
    }

    // StackPack's own files and JSON edits land BEFORE official initializers:
    // initializers like the shadcn CLI validate the project state (Tailwind
    // config, import aliases) and fail if prerequisites are not there yet.
    for (const file of plan.filesToCreate) {
      const target = resolveInsideRoot(root, file.path);
      let finalPath = file.path;
      let exists = false;
      try {
        await fs.access(target);
        exists = true;
      } catch {
        exists = false;
      }
      if (exists) {
        const resolution = options.fileResolutions?.[file.path] ?? "keep";
        if (resolution === "keep") {
          result.skippedFiles.push(file.path);
          result.notes.push(`Kept existing ${file.path}; the planned file was not written.`);
          continue;
        }
        if (resolution === "rename") {
          finalPath = renameWithSuffix(file.path);
        } else {
          await backupFiles(root, operation.filesDir, [file.path]);
        }
      }
      const finalTarget = resolveInsideRoot(root, finalPath);
      await fs.mkdir(path.dirname(finalTarget), { recursive: true });
      await fs.writeFile(finalTarget, file.contents, "utf8");
      result.createdFiles.push(finalPath);
    }

    for (const edit of plan.jsonEdits) {
      const target = resolveInsideRoot(root, edit.path);
      try {
        await fs.access(target);
      } catch {
        result.notes.push(`Skipped JSON edit: ${edit.path} does not exist.`);
        continue;
      }
      progress(`Updating ${edit.path}...`);
      let content = await fs.readFile(target, "utf8");
      for (const change of edit.edits) {
        const edits = modify(content, change.jsonPath, change.value, {
          formattingOptions: { insertSpaces: true, tabSize: 2 },
        });
        content = applyEdits(content, edits);
      }
      const reparsed: unknown = parseJsonc(content);
      if (typeof reparsed !== "object" || reparsed === null) {
        throw new StackPackError(`Refusing to write ${edit.path}: edit produced invalid JSON.`);
      }
      await fs.writeFile(target, content, "utf8");
      result.modifiedFiles.push(edit.path);
    }

    for (const entry of plan.initializers) {
      progress(`Running the official ${entry.name} initializer...`);
      await runOrThrow(
        options.runner,
        entry.initializer.buildCommand(pm, root),
        `Official ${entry.name} initializer`,
        result.commandsRun,
      );
    }

    // Official tools may have changed anything; rescan afterwards.
    progress("Rescanning the project...");
    result.refreshedContext = await detectProject(root, { packageManagerOverride: pm });

    const finalScripts: Record<string, string> = {};
    const conflictNames = new Set(plan.scriptConflicts.map((c) => c.name));
    for (const script of plan.scripts) {
      if (!conflictNames.has(script.name)) {
        finalScripts[script.name] = script.command;
        continue;
      }
      const resolution = options.scriptResolutions?.[script.name] ?? "alternate";
      if (resolution === "skip") {
        result.notes.push(`Kept the existing "${script.name}" script unchanged.`);
      } else if (resolution === "replace") {
        finalScripts[script.name] = script.command;
      } else {
        const alternate = `${script.name}:${script.command.split(" ")[0]}`;
        finalScripts[alternate] = script.command;
        result.notes.push(
          `Added the script as "${alternate}" to keep your existing "${script.name}".`,
        );
      }
    }
    if (Object.keys(finalScripts).length > 0) {
      progress("Updating package.json scripts...");
      await updatePackageJsonScripts(root, finalScripts);
      result.modifiedFiles.push("package.json");
    } else if (plan.dependencies.length > 0 || plan.devDependencies.length > 0) {
      result.modifiedFiles.push("package.json");
    }

    await writeOperationSummary(operation, {
      ...summaryBase,
      status: "completed",
      finishedAt: new Date().toISOString(),
    });
  } catch (error) {
    await writeOperationSummary(operation, {
      ...summaryBase,
      status: "failed",
      finishedAt: new Date().toISOString(),
    }).catch(() => {});
    throw error;
  }

  return result;
}
