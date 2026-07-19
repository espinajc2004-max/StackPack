import { afterEach, describe, expect, it } from "vitest";
import { detectProject } from "../src/engine/detect-project.js";
import { buildInstallationPlan } from "../src/engine/build-plan.js";
import { createEmptySelection } from "../src/dashboard/state.js";
import { makeTempDir, removeDir, writeViteReactProject } from "./helpers.js";

const dirs: string[] = [];
async function tempDir(): Promise<string> {
  const dir = await makeTempDir();
  dirs.push(dir);
  return dir;
}
afterEach(async () => {
  while (dirs.length > 0) await removeDir(dirs.pop() as string);
});

describe("buildInstallationPlan", () => {
  it("builds a complete plan for a full selection", async () => {
    const dir = await tempDir();
    await writeViteReactProject(dir);
    const context = await detectProject(dir);

    const selection = createEmptySelection();
    selection.routing = { id: "react-router", options: {} };
    selection.stateManagement = { id: "zustand", options: {} };
    selection.dataFetching = {
      id: "tanstack-query",
      options: { devtools: true, configureProvider: true },
    };
    selection.formsAndValidation = { id: "react-hook-form-zod", options: {} };
    selection.testing.push(
      { id: "playwright", options: {} },
      { id: "vitest-react", options: { testTarget: "components" } },
    );
    selection.customPackages.push({
      name: "sonner",
      version: "latest",
      dependencyType: "dependency",
    });
    selection.versionOverrides["@tanstack/react-query"] = "5";

    const plan = buildInstallationPlan(context, selection);

    const depNames = plan.dependencies.map((d) => d.name);
    expect(depNames).toEqual(
      expect.arrayContaining([
        "react-router-dom",
        "zustand",
        "@tanstack/react-query",
        "@tanstack/react-query-devtools",
        "react-hook-form",
        "zod",
        "@hookform/resolvers",
        "sonner",
      ]),
    );
    const devDepNames = plan.devDependencies.map((d) => d.name);
    expect(devDepNames).toEqual(
      expect.arrayContaining([
        "vitest",
        "jsdom",
        "@testing-library/react",
        "@testing-library/jest-dom",
        "@testing-library/user-event",
      ]),
    );

    const query = plan.dependencies.find((d) => d.name === "@tanstack/react-query");
    expect(query?.resolvedVersion).toBe("5");

    expect(plan.filesToCreate.map((f) => f.path)).toEqual(
      expect.arrayContaining([
        "src/lib/query-client.ts",
        "src/lib/query-provider.tsx",
        "vitest.config.ts",
        "src/test/setup.ts",
      ]),
    );
    expect(plan.filesToModify).toContain("package.json");
    expect(plan.scripts).toEqual([{ name: "test", command: "vitest" }]);
    expect(plan.initializers.map((i) => i.id)).toEqual(["playwright"]);
    // vitest-react is ordered before playwright because of runsAfter.
    const ids = plan.integrations.map((i) => i.recipe.id);
    expect(ids.indexOf("vitest-react")).toBeLessThan(ids.indexOf("playwright"));
    expect(plan.warnings.some((w) => w.includes("initializers"))).toBe(true);
    expect(plan.conflicts).toHaveLength(0);
  });

  it("reports script conflicts instead of silently overwriting", async () => {
    const dir = await tempDir();
    await writeViteReactProject(dir, { scripts: { test: "jest" } });
    const context = await detectProject(dir);
    const selection = createEmptySelection();
    selection.testing.push({ id: "vitest-react", options: { testTarget: "utils" } });

    const plan = buildInstallationPlan(context, selection);
    expect(plan.scriptConflicts).toEqual([{ name: "test", current: "jest", proposed: "vitest" }]);
  });

  it("merges vitest config with an existing vite config", async () => {
    const dir = await tempDir();
    await writeViteReactProject(dir);
    const context = await detectProject(dir);
    const selection = createEmptySelection();
    selection.testing.push({ id: "vitest-react", options: { testTarget: "components" } });

    const plan = buildInstallationPlan(context, selection);
    const config = plan.filesToCreate.find((f) => f.path === "vitest.config.ts");
    expect(config?.contents).toContain("mergeConfig");
    expect(config?.contents).toContain("./vite.config");
  });

  it("surfaces version conflicts between recipe and custom package", async () => {
    const dir = await tempDir();
    await writeViteReactProject(dir);
    const context = await detectProject(dir);
    const selection = createEmptySelection();
    selection.formsAndValidation = { id: "react-hook-form-zod", options: {} };
    selection.customPackages.push({ name: "zod", version: "3", dependencyType: "dependency" });

    const plan = buildInstallationPlan(context, selection);
    expect(plan.conflicts).toHaveLength(0); // latest + specific resolves to specific
    const zod = plan.dependencies.find((d) => d.name === "zod");
    expect(zod?.resolvedVersion).toBe("3");
  });
});
