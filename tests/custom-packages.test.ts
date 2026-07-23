import { afterEach, describe, expect, it } from "vitest";
import { addCustomPackageToSelection } from "../src/dashboard/custom-packages.js";
import { createEmptySelection } from "../src/dashboard/state.js";
import { detectProject } from "../src/engine/detect-project.js";
import { buildInstallationPlan } from "../src/engine/build-plan.js";
import { applyPlan } from "../src/engine/apply-plan.js";
import { buildPresetFromSelection } from "../src/commands/shared.js";
import { presetToSelection } from "../src/commands/selection-utils.js";
import { loadPreset, savePreset } from "../src/storage/preset-store.js";
import { makeTempDir, removeDir, writeViteReactProject } from "./helpers.js";

const dirs: string[] = [];

afterEach(async () => {
  while (dirs.length > 0) await removeDir(dirs.pop() as string);
});

describe("additional npm packages", () => {
  it("validates input and prevents duplicate package names", () => {
    const selection = createEmptySelection();

    expect(addCustomPackageToSelection(selection, "not a package", "dependency").ok).toBe(false);
    expect(addCustomPackageToSelection(selection, "nanoid@^5.1.5", "dependency")).toEqual({
      ok: true,
      entry: { name: "nanoid", version: "^5.1.5", dependencyType: "dependency" },
    });
    expect(addCustomPackageToSelection(selection, "nanoid@latest", "devDependency")).toEqual({
      ok: false,
      reason: "nanoid is already in this setup.",
    });
  });

  it("survives setup, preset save/load, and the installation plan", async () => {
    const project = await makeTempDir();
    dirs.push(project);
    await writeViteReactProject(project);
    const context = await detectProject(project);
    const selection = createEmptySelection();

    expect(addCustomPackageToSelection(selection, "nanoid@^5.1.5", "dependency").ok).toBe(true);
    expect(addCustomPackageToSelection(selection, "knip@^5.0.0", "devDependency").ok).toBe(true);

    const preset = buildPresetFromSelection({
      name: "custom-package-lifecycle",
      scope: "local",
      context,
      selection,
    });
    expect(preset).not.toBeNull();
    await savePreset(preset!, "local", { projectRoot: project });
    const loaded = await loadPreset("custom-package-lifecycle", { projectRoot: project });
    const restored = presetToSelection(loaded.preset);

    expect(restored.customPackages).toEqual([
      { name: "nanoid", version: "^5.1.5", dependencyType: "dependency" },
      { name: "knip", version: "^5.0.0", dependencyType: "devDependency" },
    ]);

    const plan = buildInstallationPlan(context, restored);
    expect(plan.dependencies.find((pkg) => pkg.name === "nanoid")?.requestedBy).toEqual([
      "custom package",
    ]);
    expect(plan.devDependencies.find((pkg) => pkg.name === "knip")?.requestedBy).toEqual([
      "custom package",
    ]);

    const dryRun = await applyPlan(plan, {
      dryRun: true,
      runner: async () => ({ exitCode: 0, stdout: "", stderr: "" }),
    });
    expect(dryRun.commandsRun).toEqual(
      expect.arrayContaining([
        expect.stringContaining("nanoid@^5.1.5"),
        expect.stringContaining("knip@^5.0.0"),
      ]),
    );
  });
});
