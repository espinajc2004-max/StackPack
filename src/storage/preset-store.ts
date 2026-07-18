import fs from "node:fs";
import path from "node:path";
import { StackPackError } from "../utils/errors.js";
import { validatePresetName } from "../utils/sanitize-name.js";
import { presetSchema, type Preset } from "../schemas/preset-schema.js";
import {
  backupsDir,
  ensureDirs,
  presetsDir,
  projectPresetsDir,
} from "./paths.js";

export type PresetScope = "global" | "local";

export interface StoredPreset {
  preset: Preset;
  scope: PresetScope;
  filePath: string;
}

function scopeDir(scope: PresetScope, cwd?: string): string {
  return scope === "global" ? presetsDir() : projectPresetsDir(cwd);
}

function presetFilePath(name: string, scope: PresetScope, cwd?: string): string {
  const invalid = validatePresetName(name);
  if (invalid) throw new StackPackError(`Invalid preset name "${name}"`, invalid);
  return path.join(scopeDir(scope, cwd), `${name}.json`);
}

export function parsePresetJson(label: string, json: string): Preset {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new StackPackError(`"${label}" is not valid JSON`);
  }
  const result = presetSchema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues
      .slice(0, 5)
      .map((i) => `  ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new StackPackError(`Preset "${label}" failed validation`, issues);
  }
  return result.data;
}

export function listPresets(cwd?: string): StoredPreset[] {
  const found: StoredPreset[] = [];
  for (const scope of ["local", "global"] as const) {
    const dir = scopeDir(scope, cwd);
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir).sort()) {
      if (!file.endsWith(".json")) continue;
      const filePath = path.join(dir, file);
      try {
        const preset = parsePresetJson(file, fs.readFileSync(filePath, "utf8"));
        found.push({ preset, scope, filePath });
      } catch {
        // invalid presets are surfaced by `stackpack doctor`, not here
      }
    }
  }
  return found;
}

export function findPreset(name: string, cwd?: string): StoredPreset | undefined {
  for (const scope of ["local", "global"] as const) {
    const filePath = presetFilePath(name, scope, cwd);
    if (!fs.existsSync(filePath)) continue;
    const preset = parsePresetJson(name, fs.readFileSync(filePath, "utf8"));
    return { preset, scope, filePath };
  }
  return undefined;
}

export function loadPreset(name: string, cwd?: string): StoredPreset {
  const stored = findPreset(name, cwd);
  if (!stored) {
    const available = listPresets(cwd).map((s) => s.preset.name);
    throw new StackPackError(
      `Preset not found\n\nNo preset named "${name}" exists.`,
      available.length > 0
        ? `Available presets: ${available.join(", ")}`
        : "Run: stackpack create"
    );
  }
  return stored;
}

export function presetExists(name: string, scope: PresetScope, cwd?: string): boolean {
  return fs.existsSync(presetFilePath(name, scope, cwd));
}

export function savePreset(preset: Preset, cwd?: string): string {
  ensureDirs();
  const filePath = presetFilePath(preset.name, preset.scope, cwd);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(preset, null, 2) + "\n", "utf8");
  return filePath;
}

/** Moves the preset file to the backups directory, then removes it. */
export function deletePreset(name: string, scope: PresetScope, cwd?: string): void {
  const filePath = presetFilePath(name, scope, cwd);
  if (!fs.existsSync(filePath)) {
    throw new StackPackError(`Preset not found\n\nNo preset named "${name}" exists.`);
  }
  ensureDirs();
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  fs.copyFileSync(filePath, path.join(backupsDir(), `${name}-${stamp}.json`));
  fs.rmSync(filePath);
}
