import pc from "picocolors";
import { guard, p } from "../ui/prompts.js";
import { deletePreset, listPresets, loadPreset, savePreset } from "../storage/preset-store.js";
import { presetToSelection } from "./selection-utils.js";
import { buildPresetFromSelection, selectionMatchesPreset } from "./shared.js";
import { runDashboard } from "../dashboard/main-dashboard.js";
import type { Preset } from "../schemas/preset.js";
import type { ProjectContext } from "../schemas/project-context.js";

export async function runPresetsList(options: { cwd?: string } = {}): Promise<void> {
  const presets = await listPresets({ projectRoot: options.cwd ?? process.cwd() });
  if (presets.length === 0) {
    console.log(
      "No presets saved yet. Save one after an installation or with: stackpack save <name>",
    );
    return;
  }
  for (const preset of presets) {
    console.log(`${preset.name}  ${pc.dim(`[${preset.scope}]`)}  ${pc.dim(preset.filePath)}`);
  }
}

export async function runPresetsShow(name: string, options: { cwd?: string } = {}): Promise<void> {
  const { preset, location } = await loadPreset(name, {
    projectRoot: options.cwd ?? process.cwd(),
  });
  console.log(pc.bold(preset.displayName ?? preset.name));
  console.log(pc.dim(`${location.scope} preset — ${location.filePath}`));
  console.log("");
  console.log(`Base: ${preset.base.creator} (${preset.base.language})`);
  console.log(
    `Project: ${preset.project.framework} / ${preset.project.buildTool} / ${preset.project.language}`,
  );
  console.log("");
  console.log("Integrations:");
  if (preset.integrations.length === 0) console.log("  (none)");
  for (const integration of preset.integrations) {
    const opts = Object.entries(integration.options)
      .map(([key, value]) => `${key}=${String(value)}`)
      .join(", ");
    console.log(`  - ${integration.id}${opts.length > 0 ? ` (${opts})` : ""}`);
  }
  const deps = Object.entries(preset.customPackages.dependencies);
  const devDeps = Object.entries(preset.customPackages.devDependencies);
  if (deps.length + devDeps.length > 0) {
    console.log("");
    console.log("Custom packages:");
    for (const [pkg, version] of deps) console.log(`  - ${pkg}@${version}`);
    for (const [pkg, version] of devDeps) console.log(`  - ${pkg}@${version} (dev)`);
  }
  const overrides = Object.entries(preset.versionOverrides);
  if (overrides.length > 0) {
    console.log("");
    console.log("Version overrides:");
    for (const [pkg, version] of overrides) console.log(`  - ${pkg}: ${version}`);
  }
}

/**
 * Interactive preset browser used by the main menu: pick a preset to see its
 * contents, optionally delete it, and always have a way back.
 */
export async function runPresetsBrowser(options: { cwd?: string } = {}): Promise<void> {
  const projectRoot = options.cwd ?? process.cwd();
  for (;;) {
    const presets = await listPresets({ projectRoot });
    if (presets.length === 0) {
      p.log.info(
        "No presets saved yet. Save one after an installation or with: stackpack save <name>",
      );
      return;
    }

    const choice = guard(
      await p.select({
        message: "Saved presets",
        options: [
          ...presets.map((preset, index) => ({
            value: String(index),
            label: preset.name,
            hint: `${preset.scope} — ${preset.filePath}`,
          })),
          { value: "__delete__", label: "Delete a preset" },
          { value: "__back__", label: "Back to main menu" },
        ],
      }),
    );
    if (choice === "__back__") return;
    if (choice === "__delete__") {
      const target = guard(
        await p.select({
          message: "Which preset do you want to delete?",
          options: [
            ...presets.map((preset, index) => ({
              value: String(index),
              label: preset.name,
              hint: `${preset.scope} — ${preset.filePath}`,
            })),
            { value: "__cancel__", label: "Cancel" },
          ],
        }),
      );
      if (target === "__cancel__") continue;
      const preset = presets[Number(target)];
      if (!preset) continue;
      const confirmed = guard(
        await p.confirm({ message: `Delete preset "${preset.name}"?`, initialValue: false }),
      );
      if (confirmed) {
        const location = await deletePreset(preset.name, { projectRoot });
        p.log.success(`Deleted ${location.scope} preset: ${location.filePath}`);
      }
      continue;
    }
    const selected = presets[Number(choice)];
    if (!selected) continue;

    await runPresetsShow(selected.name, { cwd: projectRoot });

    const action = guard(
      await p.select({
        message: `Preset "${selected.name}"`,
        options: [
          { value: "list", label: "Back to preset list" },
          { value: "edit", label: "Edit this preset", hint: "swap integrations, save back" },
          { value: "delete", label: "Delete this preset" },
          { value: "menu", label: "Back to main menu" },
        ],
      }),
    );
    if (action === "menu") return;
    if (action === "edit") {
      await runPresetsEdit(selected.name, { cwd: projectRoot });
      continue;
    }
    if (action === "delete") {
      const confirmed = guard(
        await p.confirm({ message: `Delete preset "${selected.name}"?`, initialValue: false }),
      );
      if (confirmed) {
        const location = await deletePreset(selected.name, { projectRoot });
        p.log.success(`Deleted ${location.scope} preset: ${location.filePath}`);
      }
    }
  }
}

/**
 * Editing a preset never touches a real project, so the dashboard runs
 * against a synthetic context built from the preset's own project shape.
 */
function contextForPresetEditing(preset: Preset): ProjectContext {
  return {
    rootDirectory: process.cwd(),
    framework: preset.project.framework,
    buildTool: preset.project.buildTool,
    language: preset.project.language,
    packageManager: "npm",
    packageManagerCandidates: [],
    detection: "detected",
    packageJson: {},
    detectedFiles: [],
    installedPackages: {},
  };
}

/**
 * Save-and-load editing: open a preset in the dashboard, change integrations,
 * and write it back to the same file. No project is created or modified.
 */
export async function runPresetsEdit(name: string, options: { cwd?: string } = {}): Promise<void> {
  const projectRoot = options.cwd ?? process.cwd();
  const { preset, location } = await loadPreset(name, { projectRoot });

  p.log.info(`Editing ${location.scope} preset: ${location.filePath}`);
  p.log.message(
    pc.dim("Changes apply to the preset file only — no project is created or modified."),
  );

  const context = contextForPresetEditing(preset);
  const selection = presetToSelection(preset);
  const outcome = await runDashboard(context, selection, { reviewLabel: "Finish editing" });
  if (outcome !== "review") return;

  if (selectionMatchesPreset(preset, selection)) {
    p.log.info(`No changes made — preset "${preset.name}" is untouched.`);
    return;
  }

  const rebuilt = buildPresetFromSelection({
    name: preset.name,
    scope: location.scope,
    context,
    selection,
  });
  if (!rebuilt) {
    p.log.warn("This preset cannot be rebuilt (unknown framework or language). Nothing saved.");
    return;
  }
  const updated: Preset = {
    ...rebuilt,
    displayName: preset.displayName ?? preset.name,
    createdAt: preset.createdAt,
  };

  const confirmed = guard(
    await p.confirm({ message: `Save changes to preset "${preset.name}"?`, initialValue: true }),
  );
  if (!confirmed) {
    p.log.info("Changes discarded — the preset file was not modified.");
    return;
  }
  const saved = await savePreset(updated, location.scope, { projectRoot });
  p.log.success(`Preset updated: ${saved.filePath}`);
}

export async function runPresetsDelete(
  name: string,
  options: { cwd?: string } = {},
): Promise<void> {
  const storeOptions = { projectRoot: options.cwd ?? process.cwd() };
  p.intro("StackPack — delete preset");
  const confirmed = guard(
    await p.confirm({ message: `Delete preset "${name}"?`, initialValue: false }),
  );
  if (!confirmed) {
    p.outro("Nothing was deleted.");
    return;
  }
  const location = await deletePreset(name, storeOptions);
  p.outro(`Deleted ${location.scope} preset: ${location.filePath}`);
}
