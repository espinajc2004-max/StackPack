import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { presetSchema, PRESET_SCHEMA_VERSION, type Preset } from "../schemas/preset.js";
import { validatePresetName } from "../utils/names.js";
import { StackPackError } from "../utils/errors.js";
import { getProjectLocalPresetsDir, getStoragePaths } from "./paths.js";

export type PresetScope = "global" | "local";

export type PresetLocation = {
  name: string;
  scope: PresetScope;
  filePath: string;
};

export type PresetStoreOptions = {
  /** Override for the global storage base directory (tests). */
  globalBaseDir?: string;
  /** Project root used for local presets. */
  projectRoot?: string;
};

function presetDirFor(scope: PresetScope, options: PresetStoreOptions): string {
  if (scope === "global") {
    return getStoragePaths(options.globalBaseDir).presetsDir;
  }
  if (!options.projectRoot) {
    throw new StackPackError("A project directory is required for local presets.");
  }
  return getProjectLocalPresetsDir(options.projectRoot);
}

function presetFilePath(name: string, scope: PresetScope, options: PresetStoreOptions): string {
  const validation = validatePresetName(name);
  if (!validation.ok) {
    throw new StackPackError(`Invalid preset name: ${validation.reason}`);
  }
  const dir = presetDirFor(scope, options);
  const filePath = path.resolve(dir, `${name}.json`);
  if (path.dirname(filePath) !== path.resolve(dir)) {
    throw new StackPackError("Preset name resolved outside the preset directory.");
  }
  return filePath;
}

function parsePresetJson(raw: string, source: string): Preset {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch (error) {
    throw new StackPackError(`Preset file is not valid JSON: ${source}`, { cause: error });
  }
  const versionProbe = data as { schemaVersion?: unknown };
  if (
    typeof versionProbe?.schemaVersion === "number" &&
    versionProbe.schemaVersion > PRESET_SCHEMA_VERSION
  ) {
    throw new StackPackError(
      "This preset was created by a newer StackPack version. Update StackPack before using it.",
    );
  }
  const parsed = presetSchema.safeParse(data);
  if (!parsed.success) {
    throw new StackPackError(`Preset file failed validation: ${source}`, {
      hints: parsed.error.issues.slice(0, 5).map((i) => `${i.path.join(".")}: ${i.message}`),
    });
  }
  return parsed.data;
}

export async function listPresets(options: PresetStoreOptions = {}): Promise<PresetLocation[]> {
  const results: PresetLocation[] = [];
  const scopes: PresetScope[] = options.projectRoot ? ["local", "global"] : ["global"];
  for (const scope of scopes) {
    const dir = presetDirFor(scope, options);
    let entries: string[];
    try {
      entries = await fs.readdir(dir);
    } catch {
      continue;
    }
    for (const entry of entries.sort()) {
      if (!entry.endsWith(".json")) continue;
      const name = entry.slice(0, -".json".length);
      if (!validatePresetName(name).ok) continue;
      results.push({ name, scope, filePath: path.join(dir, entry) });
    }
  }
  return results;
}

export async function findPreset(
  name: string,
  options: PresetStoreOptions = {},
): Promise<PresetLocation | null> {
  const all = await listPresets(options);
  return all.find((p) => p.name === name) ?? null;
}

export async function loadPreset(
  name: string,
  options: PresetStoreOptions = {},
): Promise<{ preset: Preset; location: PresetLocation }> {
  const location = await findPreset(name, options);
  if (!location) {
    throw new StackPackError(`Preset "${name}" was not found.`, {
      hints: ["Run: stackpack presets list"],
    });
  }
  const raw = await fs.readFile(location.filePath, "utf8");
  return { preset: parsePresetJson(raw, location.filePath), location };
}

export async function presetExists(
  name: string,
  scope: PresetScope,
  options: PresetStoreOptions = {},
): Promise<boolean> {
  try {
    await fs.access(presetFilePath(name, scope, options));
    return true;
  } catch {
    return false;
  }
}

/**
 * Atomically saves a preset: writes a temporary file, re-validates it,
 * then renames it into place.
 */
export async function savePreset(
  preset: Preset,
  scope: PresetScope,
  options: PresetStoreOptions = {},
): Promise<PresetLocation> {
  const validated = presetSchema.parse(preset);
  const filePath = presetFilePath(validated.name, scope, options);
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });

  const tmpPath = path.join(dir, `.${validated.name}.${crypto.randomUUID()}.tmp`);
  const serialized = JSON.stringify(validated, null, 2) + "\n";
  await fs.writeFile(tmpPath, serialized, "utf8");
  try {
    parsePresetJson(await fs.readFile(tmpPath, "utf8"), tmpPath);
    await fs.rename(tmpPath, filePath);
  } catch (error) {
    await fs.rm(tmpPath, { force: true });
    throw error;
  }
  return { name: validated.name, scope, filePath };
}

export async function deletePreset(
  name: string,
  options: PresetStoreOptions = {},
): Promise<PresetLocation> {
  const location = await findPreset(name, options);
  if (!location) {
    throw new StackPackError(`Preset "${name}" was not found.`);
  }
  await fs.rm(location.filePath);
  return location;
}
