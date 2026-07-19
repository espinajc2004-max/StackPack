import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import { detectProject } from "../src/engine/detect-project.js";
import { buildPresetFromSelection } from "../src/commands/shared.js";
import { createEmptySelection } from "../src/dashboard/state.js";
import { deletePreset, loadPreset, savePreset } from "../src/storage/preset-store.js";
import { backupFiles, restoreBackup } from "../src/project/backups.js";
import { resolveInsideRoot } from "../src/project/safe-paths.js";
import { makeTempDir, removeDir, writeFileIn, writeViteReactProject } from "./helpers.js";

// Real-world user paths: spaces (like "John Carlo Espina"), accents, CJK.
const AWKWARD_SEGMENT = "Juan Cárlo ñ 测试 projects";

const dirs: string[] = [];
async function awkwardDir(): Promise<string> {
  const base = await makeTempDir();
  dirs.push(base);
  const dir = path.join(base, AWKWARD_SEGMENT);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}
afterEach(async () => {
  while (dirs.length > 0) await removeDir(dirs.pop() as string);
});

describe("paths with spaces and unicode", () => {
  it("detects a project living under an awkward path", async () => {
    const dir = await awkwardDir();
    await writeViteReactProject(dir);
    const context = await detectProject(dir);
    expect(context.framework).toBe("react");
    expect(context.buildTool).toBe("vite");
    expect(context.rootDirectory).toContain(AWKWARD_SEGMENT);
  });

  it("saves, loads, and deletes presets in awkward global and local stores", async () => {
    const dir = await awkwardDir();
    await writeViteReactProject(dir);
    const context = await detectProject(dir);
    const selection = createEmptySelection();
    selection.routing = { id: "react-router", options: {} };
    const preset = buildPresetFromSelection({
      name: "awkward-path-preset",
      scope: "global",
      context,
      selection,
    });
    expect(preset).not.toBeNull();
    if (!preset) return;

    // Global store rooted under the awkward path.
    const globalBaseDir = path.join(dir, ".stackpack-home");
    const saved = await savePreset(preset, "global", { globalBaseDir });
    expect(saved.filePath).toContain(AWKWARD_SEGMENT);
    const loaded = await loadPreset("awkward-path-preset", { globalBaseDir });
    expect(loaded.preset.integrations.map((i) => i.id)).toEqual(["react-router"]);
    await deletePreset("awkward-path-preset", { globalBaseDir });

    // Project-local store inside the awkward project itself.
    const localPreset = { ...preset, name: "awkward-local", displayName: "awkward-local" };
    await savePreset(localPreset, "local", { globalBaseDir, projectRoot: dir });
    const localLoaded = await loadPreset("awkward-local", { globalBaseDir, projectRoot: dir });
    expect(localLoaded.location.scope).toBe("local");
  });

  it("backs up and restores files under an awkward path", async () => {
    const dir = await awkwardDir();
    await writeFileIn(dir, "src/index.css", "original contents\n");
    const backupDir = path.join(dir, ".stackpack", "backups", "op-1", "files");
    const backedUp = await backupFiles(dir, backupDir, ["src/index.css", "missing.txt"]);
    expect(backedUp).toEqual(["src/index.css"]);

    await writeFileIn(dir, "src/index.css", "overwritten\n");
    const restored = await restoreBackup(dir, backupDir);
    expect(restored).toEqual(["src/index.css"]);
    const contents = await fs.readFile(path.join(dir, "src", "index.css"), "utf8");
    expect(contents).toBe("original contents\n");
  });

  it("keeps path-traversal protection intact under awkward roots", async () => {
    const dir = await awkwardDir();
    const inside = resolveInsideRoot(dir, "src/app.ts");
    expect(inside.startsWith(path.resolve(dir))).toBe(true);
    expect(() => resolveInsideRoot(dir, "../escape.txt")).toThrow();
  });
});
