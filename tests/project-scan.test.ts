import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  filterScannedPackages,
  runSave,
  scanProjectForPreset,
  scannedPackageKey,
} from "../src/commands/save.js";
import { buildPresetFromSelection } from "../src/commands/shared.js";
import { detectProject } from "../src/engine/detect-project.js";
import { presetSchema } from "../src/schemas/preset.js";
import { makeTempDir, removeDir, writeViteReactProject } from "./helpers.js";

const dirs: string[] = [];

afterEach(async () => {
  while (dirs.length > 0) await removeDir(dirs.pop() as string);
});

describe("project scan to preset", () => {
  it("preserves detected integration versions and safely classifies the full manifest", async () => {
    const dir = await makeTempDir();
    dirs.push(dir);
    await writeViteReactProject(dir);
    const packagePath = path.join(dir, "package.json");
    const packageJson = JSON.parse(await fs.readFile(packagePath, "utf8"));
    packageJson.dependencies = {
      ...packageJson.dependencies,
      zustand: "^4.5.0",
      "@reduxjs/toolkit": "^2.2.0",
      "react-redux": "^9.1.0",
      "react-hook-form": "^7.50.0",
      "@hookform/resolvers": "^3.3.0",
      zod: "^3.22.0",
      sonner: "^2.0.0",
      "@radix-ui/react-dialog": "^1.1.0",
      "@radix-ui/react-slot": "^1.2.0",
      "local-tool": "file:../local-tool",
      UPPERCASE: "1.0.0",
    };
    await fs.writeFile(packagePath, JSON.stringify(packageJson, null, 2));

    const context = await detectProject(dir);
    const scan = scanProjectForPreset(context);

    expect(scan.selection.stateManagement?.id).toBe("zustand");
    expect(scan.categoryCollisions).toContain("Redux Toolkit");
    expect(scan.selection.versionOverrides).toMatchObject({
      zustand: "^4.5.0",
      "react-hook-form": "^7.50.0",
      "@hookform/resolvers": "^3.3.0",
      zod: "^3.22.0",
    });
    expect(scan.selection.customPackages).toEqual(
      expect.arrayContaining([
        { name: "sonner", version: "^2.0.0", dependencyType: "dependency" },
        { name: "@reduxjs/toolkit", version: "^2.2.0", dependencyType: "dependency" },
        { name: "react-redux", version: "^9.1.0", dependencyType: "dependency" },
      ]),
    );
    expect(scan.skippedPackages.map((pkg) => pkg.name)).toEqual(
      expect.arrayContaining(["local-tool", "UPPERCASE"]),
    );

    const sonner = scan.selection.customPackages.find((pkg) => pkg.name === "sonner");
    expect(sonner).toBeDefined();
    const chosenPackages = filterScannedPackages(scan.selection.customPackages, [
      scannedPackageKey(sonner!),
    ]);
    expect(chosenPackages).toEqual([
      { name: "sonner", version: "^2.0.0", dependencyType: "dependency" },
    ]);
    expect(chosenPackages.some((pkg) => pkg.name.startsWith("@radix-ui/"))).toBe(false);

    const preset = buildPresetFromSelection({
      name: "scanned-stack",
      scope: "local",
      context,
      selection: { ...scan.selection, customPackages: chosenPackages },
    });
    expect(() => presetSchema.parse(preset)).not.toThrow();
    expect(preset?.customPackages.dependencies).toEqual({ sonner: "^2.0.0" });
  });

  it("supports explicit all-packages and integrations-only save modes", async () => {
    const dir = await makeTempDir();
    dirs.push(dir);
    await writeViteReactProject(dir);
    const packagePath = path.join(dir, "package.json");
    const packageJson = JSON.parse(await fs.readFile(packagePath, "utf8"));
    packageJson.dependencies = {
      ...packageJson.dependencies,
      zustand: "^5.0.0",
      sonner: "^2.0.0",
      "@radix-ui/react-dialog": "^1.1.0",
    };
    await fs.writeFile(packagePath, JSON.stringify(packageJson, null, 2));

    await runSave("integrations-only", {
      cwd: dir,
      local: true,
      packageSelection: "none",
    });
    const integrationsOnly = JSON.parse(
      await fs.readFile(path.join(dir, ".stackpack", "integrations-only.json"), "utf8"),
    );
    expect(integrationsOnly.integrations.map((entry: { id: string }) => entry.id)).toContain(
      "zustand",
    );
    expect(integrationsOnly.customPackages).toEqual({ dependencies: {}, devDependencies: {} });

    await runSave("all-packages", {
      cwd: dir,
      local: true,
      packageSelection: "all",
    });
    const allPackages = JSON.parse(
      await fs.readFile(path.join(dir, ".stackpack", "all-packages.json"), "utf8"),
    );
    expect(allPackages.customPackages.dependencies).toMatchObject({
      sonner: "^2.0.0",
      "@radix-ui/react-dialog": "^1.1.0",
    });
  });
});
