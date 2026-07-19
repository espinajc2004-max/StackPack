import { guard, p } from "../ui/prompts.js";
import pc from "picocolors";
import type { ProjectContext } from "../schemas/project-context.js";
import type { Preset } from "../schemas/preset.js";
import { buildInstallationPlan, type InstallationPlan } from "../engine/build-plan.js";
import {
  applyPlan,
  type ApplyResult,
  type FileConflictResolution,
  type ScriptConflictResolution,
} from "../engine/apply-plan.js";
import { detectProject } from "../engine/detect-project.js";
import { verifyProject } from "../engine/verify-project.js";
import { realCommandRunner, type CommandRunner } from "../package-manager/execute.js";
import { resolveRegistryVersions } from "../package-manager/registry.js";
import { restoreBackup } from "../project/backups.js";
import { renderPlanReview } from "../ui/review.js";
import { runVersionEditor } from "../dashboard/version-editor.js";
import { selectedRecipes, type SetupSelection } from "../dashboard/state.js";
import { savePreset, presetExists } from "../storage/preset-store.js";
import { validatePresetName } from "../utils/names.js";
import path from "node:path";

export type InstallFlowResult = "installed" | "dry-run" | "back" | "cancelled";

async function resolveScriptConflicts(
  plan: InstallationPlan,
): Promise<Record<string, ScriptConflictResolution> | "cancel"> {
  const resolutions: Record<string, ScriptConflictResolution> = {};
  for (const conflict of plan.scriptConflicts) {
    const alternate = `${conflict.name}:${conflict.proposed.split(" ")[0]}`;
    const choice = guard(
      await p.select({
        message: `Script "${conflict.name}" already exists (current: ${conflict.current})`,
        options: [
          { value: "alternate", label: `Add as ${alternate}` },
          { value: "replace", label: `Replace existing ${conflict.name} script` },
          { value: "skip", label: "Keep current script" },
          { value: "cancel", label: "Cancel installation" },
        ],
      }),
    );
    if (choice === "cancel") return "cancel";
    resolutions[conflict.name] = choice as ScriptConflictResolution;
  }
  return resolutions;
}

async function resolveFileConflicts(
  plan: InstallationPlan,
): Promise<Record<string, FileConflictResolution> | "cancel"> {
  const resolutions: Record<string, FileConflictResolution> = {};
  for (const filePath of plan.existingFileConflicts) {
    const planned = plan.filesToCreate.find((file) => file.path === filePath);
    for (;;) {
      const choice = guard(
        await p.select({
          message: `${filePath} already exists`,
          options: [
            { value: "keep", label: "Keep existing file", hint: "planned file is skipped" },
            { value: "show", label: "Show proposed contents" },
            {
              value: "rename",
              label: "Create with another name",
              hint: "adds a .stackpack suffix",
            },
            { value: "replace", label: "Replace after backup" },
            { value: "cancel", label: "Cancel installation" },
          ],
        }),
      );
      if (choice === "show") {
        p.note(planned?.contents ?? "(unknown contents)", filePath);
        continue;
      }
      if (choice === "cancel") return "cancel";
      resolutions[filePath] = choice as FileConflictResolution;
      break;
    }
  }
  return resolutions;
}

async function runVerification(
  refreshed: ProjectContext,
  plan: InstallationPlan,
  runner: CommandRunner,
  applyResult: ApplyResult,
): Promise<void> {
  const runCommands = guard(
    await p.confirm({
      message: "Run available verification commands (typecheck/build)? This can take a while.",
      initialValue: true,
    }),
  );

  for (;;) {
    const spinner = p.spinner();
    spinner.start("Verifying project...");
    const checks = await verifyProject(refreshed, plan, { runner, runCommands });
    spinner.stop("Verification finished");

    for (const check of checks) {
      const symbol =
        check.status === "passed"
          ? pc.green("✓")
          : check.status === "failed"
            ? pc.red("✗")
            : pc.dim("-");
      console.log(`  ${symbol} ${check.name}${check.detail ? pc.dim(` — ${check.detail}`) : ""}`);
    }

    const failed = checks.filter((check) => check.status === "failed");
    if (failed.length === 0) return;

    const choice = guard(
      await p.select({
        message: "Project verification failed. What would you like to do?",
        options: [
          { value: "keep", label: "Keep changes", hint: "details are shown above" },
          ...(applyResult.operationDir
            ? [{ value: "restore", label: "Restore backed-up files" }]
            : []),
          { value: "retry", label: "Retry verification" },
        ],
      }),
    );
    if (choice === "keep") return;
    if (choice === "restore") {
      const restored = await restoreBackup(
        refreshed.rootDirectory,
        path.join(applyResult.operationDir as string, "files"),
      );
      p.log.success(`Restored ${restored.length} file(s) from backup.`);
      p.log.warn("Installed packages are not automatically removed; review package.json.");
      return;
    }
  }
}

/**
 * The shared review -> confirm -> install -> verify flow used by new, add,
 * and apply. Nothing is installed before the final confirmation.
 */
export async function reviewAndInstall(params: {
  context: ProjectContext;
  selection: SetupSelection;
  dryRun: boolean;
  runner?: CommandRunner;
  allowReturnToDashboard: boolean;
}): Promise<InstallFlowResult> {
  const runner = params.runner ?? realCommandRunner;

  for (;;) {
    const plan = buildInstallationPlan(params.context, params.selection);

    const plannedPackages = [...plan.dependencies, ...plan.devDependencies];
    let registryVersions: Map<string, string> | undefined;
    if (plannedPackages.length > 0) {
      const spinner = p.spinner();
      spinner.start("Checking exact versions on the npm registry...");
      registryVersions = await resolveRegistryVersions(
        plannedPackages.map((dep) => ({ name: dep.name, version: dep.resolvedVersion })),
      );
      spinner.stop(
        registryVersions.size > 0
          ? "Exact versions resolved from the npm registry"
          : "Could not reach the npm registry; showing version ranges only",
      );
    }
    p.note(renderPlanReview(plan, registryVersions), "Review StackPack setup");

    if (
      plan.dependencies.length === 0 &&
      plan.devDependencies.length === 0 &&
      plan.initializers.length === 0 &&
      plan.filesToCreate.length === 0
    ) {
      p.log.warn("Nothing is selected yet.");
      return params.allowReturnToDashboard ? "back" : "cancelled";
    }

    const action = guard(
      await p.select({
        message: "Choose an action",
        options: [
          params.dryRun
            ? { value: "install", label: "Finish dry run", hint: "no changes will be made" }
            : { value: "install", label: "Install everything" },
          ...(params.allowReturnToDashboard
            ? [{ value: "back", label: "Return to integration dashboard" }]
            : []),
          { value: "versions", label: "Edit package versions" },
          { value: "cancel", label: "Cancel" },
        ],
      }),
    );

    if (action === "cancel") return "cancelled";
    if (action === "back") return "back";
    if (action === "versions") {
      await runVersionEditor(params.selection);
      continue;
    }

    if (plan.conflicts.length > 0) {
      p.log.error("Version conflicts must be resolved before installing:");
      for (const conflict of plan.conflicts) p.log.message(`  ${conflict.message}`);
      continue;
    }

    if (params.dryRun) {
      const result = await applyPlan(plan, { dryRun: true, runner });
      p.note(
        [
          "Commands that would run:",
          ...result.commandsRun.map((cmd) => `  ${cmd}`),
          "Files that would be created:",
          ...(result.createdFiles.length > 0
            ? result.createdFiles.map((file) => `  + ${file}`)
            : ["  (none)"]),
          "Files that would be modified:",
          ...(result.modifiedFiles.length > 0
            ? result.modifiedFiles.map((file) => `  ~ ${file}`)
            : ["  (none)"]),
        ].join("\n"),
        "Dry run",
      );
      p.log.success("Dry run complete. No project files were changed.");
      return "dry-run";
    }

    const scriptResolutions = await resolveScriptConflicts(plan);
    if (scriptResolutions === "cancel") continue;
    const fileResolutions = await resolveFileConflicts(plan);
    if (fileResolutions === "cancel") continue;

    let applyResult: ApplyResult;
    const spinner = p.spinner();
    const interactive = plan.initializers.length > 0;
    try {
      if (!interactive) spinner.start("Installing...");
      applyResult = await applyPlan(plan, {
        dryRun: false,
        runner,
        scriptResolutions,
        fileResolutions,
        onProgress: (message) => {
          if (interactive) p.log.step(message);
          else spinner.message(message);
        },
      });
      if (!interactive) spinner.stop("Installation finished");
    } catch (error) {
      if (!interactive) spinner.stop("Installation failed");
      throw error;
    }

    if (applyResult.createdFiles.length > 0) {
      p.log.success(`Created: ${applyResult.createdFiles.join(", ")}`);
    }
    if (applyResult.modifiedFiles.length > 0) {
      p.log.success(`Modified: ${[...new Set(applyResult.modifiedFiles)].join(", ")}`);
    }
    for (const note of applyResult.notes) {
      p.log.message(pc.dim(note));
    }

    const refreshed =
      applyResult.refreshedContext ??
      (await detectProject(params.context.rootDirectory, {
        packageManagerOverride: params.context.packageManager,
      }));
    await runVerification(refreshed, plan, runner, applyResult);
    return "installed";
  }
}

/** Builds a preset from the current context and selection. */
export function buildPresetFromSelection(params: {
  name: string;
  scope: "global" | "local";
  context: ProjectContext;
  selection: SetupSelection;
}): Preset | null {
  const { context, selection } = params;
  if (context.framework === "unknown" || context.language === "unknown") return null;
  const buildTool = context.buildTool === "unknown" ? undefined : context.buildTool;
  if (!buildTool) return null;

  const now = new Date().toISOString();
  const dependencies: Record<string, string> = {};
  const devDependencies: Record<string, string> = {};
  for (const pkg of selection.customPackages) {
    (pkg.dependencyType === "dependency" ? dependencies : devDependencies)[pkg.name] = pkg.version;
  }

  return {
    schemaVersion: 1,
    name: params.name,
    displayName: params.name,
    scope: params.scope,
    createdAt: now,
    updatedAt: now,
    base: {
      creator: context.framework === "next" ? "next" : "vite",
      language: context.language,
      creatorOptions: {},
    },
    project: {
      framework: context.framework,
      buildTool,
      language: context.language,
    },
    integrations: selectedRecipes(selection).map(({ recipe, options }) => ({
      id: recipe.id,
      recipeVersion: recipe.recipeVersion,
      options,
    })),
    customPackages: { dependencies, devDependencies },
    versionOverrides: selection.versionOverrides,
  };
}

/** Post-install offer to save the applied setup as a preset. */
export async function offerToSavePreset(
  context: ProjectContext,
  selection: SetupSelection,
): Promise<void> {
  if (context.framework === "unknown" || context.language === "unknown") return;

  const wantsSave = guard(
    await p.confirm({ message: "Save this setup as a preset?", initialValue: false }),
  );
  if (!wantsSave) return;

  const name = guard(
    await p.text({
      message: "Preset name",
      placeholder: "my-react-stack",
      validate(value) {
        const result = validatePresetName(value ?? "");
        return result.ok ? undefined : result.reason;
      },
    }),
  ).trim();

  const scope = guard(
    await p.select({
      message: "Preset location",
      options: [
        { value: "global", label: "Global, available on this device" },
        { value: "local", label: "Local, stored inside this project", hint: ".stackpack/" },
      ],
    }),
  ) as "global" | "local";

  const storeOptions = { projectRoot: context.rootDirectory };
  if (await presetExists(name, scope, storeOptions)) {
    const overwrite = guard(
      await p.select({
        message: `Preset "${name}" already exists`,
        options: [
          { value: "cancel", label: "Keep the existing preset" },
          { value: "replace", label: "Replace it" },
        ],
      }),
    );
    if (overwrite === "cancel") return;
  }

  const preset = buildPresetFromSelection({ name, scope, context, selection });
  if (!preset) {
    p.log.warn("This project cannot be represented as a preset (unknown framework or language).");
    return;
  }
  const location = await savePreset(preset, scope, storeOptions);
  p.log.success(`Preset saved\n  Name: ${name}\n  Location: ${location.filePath}`);
}
