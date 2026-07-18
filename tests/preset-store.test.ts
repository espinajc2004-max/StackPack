import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  deletePreset,
  findPreset,
  listPresets,
  loadPreset,
  presetExists,
  savePreset,
} from "../src/storage/preset-store.js";
import { backupsDir } from "../src/storage/paths.js";
import {
  PRESET_SCHEMA_VERSION,
  type Preset,
} from "../src/schemas/preset-schema.js";
import { StackPackError } from "../src/utils/errors.js";

function makePreset(name: string, scope: "global" | "local" = "global"): Preset {
  const now = new Date().toISOString();
  return {
    schemaVersion: PRESET_SCHEMA_VERSION,
    name,
    displayName: name,
    scope,
    createdAt: now,
    updatedAt: now,
    environment: { type: "general" },
    selections: {},
    dependencies: { react: "latest" },
    devDependencies: {},
    recipes: [],
    files: [],
    scripts: {},
  };
}

let tmpHome: string;
let tmpProject: string;

beforeEach(() => {
  tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), "stackpack-home-"));
  tmpProject = fs.mkdtempSync(path.join(os.tmpdir(), "stackpack-proj-"));
  process.env.STACKPACK_HOME = tmpHome;
});

afterEach(() => {
  delete process.env.STACKPACK_HOME;
  fs.rmSync(tmpHome, { recursive: true, force: true });
  fs.rmSync(tmpProject, { recursive: true, force: true });
});

describe("preset store", () => {
  it("saves and loads a global preset", () => {
    savePreset(makePreset("alpha"));
    const stored = loadPreset("alpha");
    expect(stored.scope).toBe("global");
    expect(stored.preset.dependencies).toEqual({ react: "latest" });
  });

  it("saves project-local presets under .stackpack", () => {
    const filePath = savePreset(makePreset("team", "local"), tmpProject);
    expect(filePath).toBe(path.join(tmpProject, ".stackpack", "team.json"));
    expect(presetExists("team", "local", tmpProject)).toBe(true);
  });

  it("prefers local presets over global ones with the same name", () => {
    savePreset(makePreset("dup"));
    savePreset(makePreset("dup", "local"), tmpProject);
    expect(findPreset("dup", tmpProject)?.scope).toBe("local");
  });

  it("lists local and global presets together", () => {
    savePreset(makePreset("global-one"));
    savePreset(makePreset("local-one", "local"), tmpProject);
    const names = listPresets(tmpProject).map((s) => s.preset.name);
    expect(names).toContain("global-one");
    expect(names).toContain("local-one");
  });

  it("backs up a preset before deleting it", () => {
    savePreset(makePreset("doomed"));
    deletePreset("doomed", "global");
    expect(presetExists("doomed", "global")).toBe(false);
    const backups = fs.readdirSync(backupsDir());
    expect(backups.some((f) => f.startsWith("doomed-"))).toBe(true);
  });

  it("throws a friendly error for missing presets", () => {
    expect(() => loadPreset("nope")).toThrow(StackPackError);
  });

  it("rejects traversal preset names", () => {
    expect(() => loadPreset("../escape")).toThrow(StackPackError);
    expect(() => loadPreset("..\\escape")).toThrow(StackPackError);
  });

  it("skips invalid preset files when listing", () => {
    savePreset(makePreset("good"));
    fs.writeFileSync(
      path.join(tmpHome, "presets", "bad.json"),
      "not json",
      "utf8"
    );
    const names = listPresets().map((s) => s.preset.name);
    expect(names).toEqual(["good"]);
  });
});
