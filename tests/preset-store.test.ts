import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { deletePreset, listPresets, loadPreset, savePreset } from "../src/storage/preset-store.js";
import type { Preset } from "../src/schemas/preset.js";
import { makeTempDir, removeDir, writeFileIn } from "./helpers.js";

const dirs: string[] = [];
async function tempDir(): Promise<string> {
  const dir = await makeTempDir();
  dirs.push(dir);
  return dir;
}
afterEach(async () => {
  while (dirs.length > 0) await removeDir(dirs.pop() as string);
});

function samplePreset(name = "jc-react-stack"): Preset {
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    name,
    displayName: "JC React Stack",
    scope: "global",
    createdAt: now,
    updatedAt: now,
    base: { creator: "vite", language: "typescript", creatorOptions: {} },
    project: { framework: "react", buildTool: "vite", language: "typescript" },
    integrations: [
      { id: "react-router", recipeVersion: 1, options: {} },
      { id: "tanstack-query", recipeVersion: 1, options: { devtools: true } },
    ],
    customPackages: { dependencies: { sonner: "latest" }, devDependencies: {} },
    versionOverrides: { "@tanstack/react-query": "5" },
  };
}

describe("preset store", () => {
  it("saves atomically and loads back a validated preset", async () => {
    const home = await tempDir();
    const location = await savePreset(samplePreset(), "global", { globalBaseDir: home });
    expect(location.filePath).toContain(path.join(home, "presets"));

    const { preset } = await loadPreset("jc-react-stack", { globalBaseDir: home });
    expect(preset.versionOverrides["@tanstack/react-query"]).toBe("5");

    const files = await fs.readdir(path.join(home, "presets"));
    expect(files).toEqual(["jc-react-stack.json"]); // no leftover temp files
  });

  it("rejects unsafe preset names", async () => {
    const home = await tempDir();
    await expect(
      savePreset({ ...samplePreset(), name: "../escape" }, "global", { globalBaseDir: home }),
    ).rejects.toThrow();
  });

  it("rejects invalid preset JSON with actionable errors", async () => {
    const home = await tempDir();
    await writeFileIn(
      home,
      "presets/broken.json",
      JSON.stringify({ schemaVersion: 1, name: "broken" }),
    );
    await expect(loadPreset("broken", { globalBaseDir: home })).rejects.toThrow(/validation/);
  });

  it("refuses presets from a newer StackPack version", async () => {
    const home = await tempDir();
    await writeFileIn(
      home,
      "presets/future.json",
      JSON.stringify({ schemaVersion: 99, name: "future" }),
    );
    await expect(loadPreset("future", { globalBaseDir: home })).rejects.toThrow(
      /newer StackPack version/,
    );
  });

  it("lists local presets before global ones and deletes by discovered location", async () => {
    const home = await tempDir();
    const project = await tempDir();
    await savePreset(samplePreset("global-stack"), "global", { globalBaseDir: home });
    await savePreset(samplePreset("team-stack"), "local", {
      globalBaseDir: home,
      projectRoot: project,
    });

    const listed = await listPresets({ globalBaseDir: home, projectRoot: project });
    expect(listed.map((p) => `${p.scope}:${p.name}`)).toEqual([
      "local:team-stack",
      "global:global-stack",
    ]);

    await deletePreset("team-stack", { globalBaseDir: home, projectRoot: project });
    const after = await listPresets({ globalBaseDir: home, projectRoot: project });
    expect(after.map((p) => p.name)).toEqual(["global-stack"]);
  });
});
