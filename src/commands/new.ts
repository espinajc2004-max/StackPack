import fs from "node:fs/promises";
import path from "node:path";
import { guard, p } from "../ui/prompts.js";
import pc from "picocolors";
import { allCreators, getCreator } from "../creators/registry.js";
import type { CreatorAdapter, CreatorOptions } from "../creators/types.js";
import { detectProject } from "../engine/detect-project.js";
import { createEmptySelection, type SetupSelection } from "../dashboard/state.js";
import { dashboardInstallLoop } from "./flow.js";
import { presetToSelection } from "./selection-utils.js";
import { loadPreset } from "../storage/preset-store.js";
import { loadConfig } from "../storage/config-store.js";
import { realCommandRunner } from "../package-manager/execute.js";
import { formatCommand, type PackageManager } from "../package-manager/types.js";
import { validateProjectName } from "../utils/names.js";
import { CancelledError, StackPackError } from "../utils/errors.js";
import type { Preset } from "../schemas/preset.js";
import { describeContext } from "../ui/messages.js";

async function directoryState(target: string): Promise<"missing" | "empty" | "occupied"> {
  try {
    const entries = await fs.readdir(target);
    return entries.length === 0 ? "empty" : "occupied";
  } catch {
    return "missing";
  }
}

async function askProjectName(initial?: string): Promise<{ name: string; destination: string }> {
  let candidate = initial;
  for (;;) {
    if (!candidate) {
      candidate = guard(
        await p.text({
          message: "Project name",
          placeholder: "my-application",
          validate(value) {
            const result = validateProjectName(value ?? "");
            return result.ok ? undefined : result.reason;
          },
        }),
      ).trim();
    }
    const validation = validateProjectName(candidate);
    if (!validation.ok) {
      p.log.error(validation.reason);
      candidate = undefined;
      continue;
    }
    const destination = path.resolve(process.cwd(), candidate);
    const state = await directoryState(destination);
    if (state === "missing") return { name: candidate, destination };
    if (state === "empty") {
      const choice = guard(
        await p.select({
          message: `Folder "${candidate}" already exists but is empty.`,
          options: [
            { value: "use", label: "Use it (it is empty)" },
            { value: "rename", label: "Enter another name" },
            { value: "cancel", label: "Cancel" },
          ],
        }),
      );
      if (choice === "use") return { name: candidate, destination };
      if (choice === "cancel") throw new CancelledError();
      candidate = undefined;
      continue;
    }
    const choice = guard(
      await p.select({
        message: `Folder "${candidate}" already exists and is not empty.`,
        options: [
          { value: "rename", label: "Enter another name" },
          { value: "cancel", label: "Cancel" },
        ],
      }),
    );
    if (choice === "cancel") throw new CancelledError();
    candidate = undefined;
  }
}

async function runOfficialCreator(
  creator: CreatorAdapter,
  projectName: string,
  creatorOptions: CreatorOptions,
  packageManager: PackageManager,
): Promise<void> {
  const command = creator.buildCommand(projectName, creatorOptions, packageManager, process.cwd());
  for (;;) {
    p.log.step(`Running the official ${creator.officialTool} creator: ${formatCommand(command)}`);
    const result = await realCommandRunner(command);
    if (result.exitCode === 0) {
      p.log.success(`Official ${creator.name} project created`);
      return;
    }
    const choice = guard(
      await p.select({
        message: `Official project creator failed (${creator.officialTool}, exit code ${result.exitCode}). The destination folder may contain partial files.`,
        options: [
          { value: "retry", label: "Retry" },
          { value: "keep", label: "Keep partial project and exit" },
          { value: "exit", label: "Exit" },
        ],
      }),
    );
    if (choice === "retry") continue;
    if (choice === "keep") {
      throw new StackPackError(
        `The official creator failed; partial files may exist in "${projectName}". Nothing was deleted.`,
      );
    }
    throw new CancelledError();
  }
}

export async function runNew(
  projectNameArg: string | undefined,
  options: { preset?: string; packageManager?: PackageManager },
): Promise<void> {
  p.intro("StackPack — new project");
  p.log.message(pc.dim("Official project tooling with real-world integrations."));

  let preset: Preset | undefined;
  if (options.preset) {
    const loaded = await loadPreset(options.preset, { projectRoot: process.cwd() });
    preset = loaded.preset;
    p.note(
      [
        `Preset\n  ${preset.displayName ?? preset.name}`,
        `Base\n  ${getCreator(preset.base.creator).name}\n  ${
          preset.base.language === "typescript" ? "TypeScript" : "JavaScript"
        }`,
        `Integrations\n${
          preset.integrations.length > 0
            ? preset.integrations.map((i) => `  ${i.id}`).join("\n")
            : "  (none)"
        }`,
      ].join("\n\n"),
      "Preset detected",
    );
    const proceed = guard(await p.confirm({ message: "Continue?", initialValue: true }));
    if (!proceed) throw new CancelledError();
  }

  const { name, destination } = await askProjectName(projectNameArg);

  const creator = preset
    ? getCreator(preset.base.creator)
    : getCreator(
        guard(
          await p.select({
            message: "Choose a base project",
            options: allCreators.map((adapter) => ({
              value: adapter.id,
              label: adapter.name,
              hint: `official ${adapter.officialTool}`,
            })),
          }),
        ) as CreatorAdapter["id"],
      );

  const language =
    preset?.base.language ??
    (guard(
      await p.select({
        message: "Choose a language",
        options: [
          { value: "typescript", label: "TypeScript" },
          { value: "javascript", label: "JavaScript" },
        ],
      }),
    ) as "typescript" | "javascript");

  const config = await loadConfig();
  const packageManager: PackageManager =
    options.packageManager ?? config.defaultPackageManager ?? "npm";
  const creatorOptions: CreatorOptions = { language };

  p.note(
    [
      `Project\n  ${name}`,
      `Official creator\n  ${creator.officialTool}`,
      `Framework\n  ${creator.frameworkLabel}`,
      `Language\n  ${language === "typescript" ? "TypeScript" : "JavaScript"}`,
      `Template\n  ${creator.templateLabel(creatorOptions)}`,
      `Package manager\n  ${packageManager}`,
    ].join("\n\n"),
    "Base project",
  );
  const create = guard(
    await p.confirm({ message: "Create the base project?", initialValue: true }),
  );
  if (!create) throw new CancelledError();

  await runOfficialCreator(creator, name, creatorOptions, packageManager);

  // Never trust the original selections; inspect what was actually generated.
  const context = await detectProject(destination, { packageManagerOverride: packageManager });
  p.note(describeContext(context), "Generated project detected");

  const selection: SetupSelection = preset ? presetToSelection(preset) : createEmptySelection();
  const outcome = await dashboardInstallLoop({
    context,
    selection,
    dryRun: false,
    startAtReview: preset !== undefined,
  });

  if (outcome === "cancelled") {
    p.outro(`Base project created at ${destination}. No integrations were installed.`);
    return;
  }
  p.outro(`Project ready at ${destination}`);
}
