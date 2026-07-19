import pc from "picocolors";
import { guard, p } from "../ui/prompts.js";
import { deletePreset, listPresets, loadPreset } from "../storage/preset-store.js";

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
