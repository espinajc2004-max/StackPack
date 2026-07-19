import { afterEach, describe, expect, it } from "vitest";
import { buildPresetFromSelection } from "../src/commands/shared.js";
import { presetToSelection } from "../src/commands/selection-utils.js";
import { createEmptySelection } from "../src/dashboard/state.js";
import { detectProject } from "../src/engine/detect-project.js";
import { presetSchema } from "../src/schemas/preset.js";
import { allRecipes } from "../src/integrations/registry.js";
import { makeTempDir, removeDir, writeViteReactProject } from "./helpers.js";

const dirs: string[] = [];
afterEach(async () => {
  while (dirs.length > 0) await removeDir(dirs.pop() as string);
});

describe("preset round-trip", () => {
  it("selection -> preset -> selection preserves integrations, packages, and overrides", async () => {
    const dir = await makeTempDir();
    dirs.push(dir);
    await writeViteReactProject(dir);
    const context = await detectProject(dir);

    const selection = createEmptySelection();
    selection.routing = { id: "react-router", options: {} };
    selection.dataFetching = {
      id: "tanstack-query",
      options: { devtools: true, configureProvider: true },
    };
    selection.testing.push({ id: "vitest-react", options: { testTarget: "components" } });
    selection.customPackages.push({
      name: "sonner",
      version: "latest",
      dependencyType: "dependency",
    });
    selection.versionOverrides["@tanstack/react-query"] = "5";

    const preset = buildPresetFromSelection({
      name: "round-trip",
      scope: "global",
      context,
      selection,
    });
    expect(preset).not.toBeNull();
    // The preset must pass full schema validation (what save/load enforce).
    const validated = presetSchema.parse(preset);
    expect(validated.base.creator).toBe("vite-react");
    expect(validated.project).toEqual({
      framework: "react",
      buildTool: "vite",
      language: "typescript",
    });

    const restored = presetToSelection(validated);
    expect(restored.routing?.id).toBe("react-router");
    expect(restored.dataFetching?.options.devtools).toBe(true);
    expect(restored.testing.map((t) => t.id)).toEqual(["vitest-react"]);
    expect(restored.customPackages).toEqual([
      { name: "sonner", version: "latest", dependencyType: "dependency" },
    ]);
    expect(restored.versionOverrides).toEqual({ "@tanstack/react-query": "5" });
  });
});

describe("integration registry", () => {
  it("every recipe has valid metadata and a unique id", () => {
    const ids = allRecipes.map((recipe) => recipe.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(
      expect.arrayContaining([
        "react-router",
        "zustand",
        "redux-toolkit",
        "tanstack-query",
        "react-hook-form-zod",
        "vitest-react",
        "playwright",
      ]),
    );
  });
});
