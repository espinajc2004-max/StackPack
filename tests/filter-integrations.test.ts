import { afterEach, describe, expect, it } from "vitest";
import { detectProject } from "../src/engine/detect-project.js";
import { filterIntegrations } from "../src/engine/filter-integrations.js";
import { installedSummary } from "../src/dashboard/main-dashboard.js";
import { allRecipes } from "../src/integrations/registry.js";
import {
  makeTempDir,
  removeDir,
  writeFileIn,
  writeNextProject,
  writeViteReactProject,
} from "./helpers.js";

const dirs: string[] = [];
async function tempDir(): Promise<string> {
  const dir = await makeTempDir();
  dirs.push(dir);
  return dir;
}
afterEach(async () => {
  while (dirs.length > 0) await removeDir(dirs.pop() as string);
});

function availabilityFor(id: string, availabilities: ReturnType<typeof filterIntegrations>) {
  const found = availabilities.find((a) => a.recipe.id === id);
  if (!found) throw new Error(`missing availability for ${id}`);
  return found;
}

describe("filterIntegrations", () => {
  it("offers React Router on React Vite projects", async () => {
    const dir = await tempDir();
    await writeViteReactProject(dir);
    const context = await detectProject(dir);
    const availabilities = filterIntegrations(context, allRecipes);
    expect(availabilityFor("react-router", availabilities).compatibility).toBe("compatible");
    expect(availabilityFor("vitest-react", availabilities).compatibility).toBe("compatible");
  });

  it("hides React Router on Next.js with a retained reason", async () => {
    const dir = await tempDir();
    await writeNextProject(dir);
    const context = await detectProject(dir);
    const availabilities = filterIntegrations(context, allRecipes);
    const reactRouter = availabilityFor("react-router", availabilities);
    expect(reactRouter.compatibility).toBe("incompatible");
    expect(reactRouter.reason).toMatch(/Next\.js routing/);
  });

  it("marks installed integrations as already installed", async () => {
    const dir = await tempDir();
    await writeViteReactProject(dir);
    await writeFileIn(
      dir,
      "package.json",
      JSON.stringify({
        name: "fixture-app",
        dependencies: { react: "^19.0.0", "react-dom": "^19.0.0", zustand: "^5.0.0" },
        devDependencies: { vite: "^7.0.0", typescript: "~5.8.0" },
      }),
    );
    const context = await detectProject(dir);
    const availabilities = filterIntegrations(context, allRecipes);
    const zustand = availabilityFor("zustand", availabilities);
    expect(zustand.compatibility).toBe("already-installed");
    expect(zustand.detection.installedVersion).toBe("^5.0.0");
  });
});

describe("installedSummary (dashboard inventory)", () => {
  it("summarizes installed integrations per category with versions", async () => {
    const dir = await tempDir();
    await writeViteReactProject(dir);
    await writeFileIn(
      dir,
      "package.json",
      JSON.stringify({
        name: "fixture-app",
        dependencies: {
          react: "^19.0.0",
          "react-dom": "^19.0.0",
          "react-router-dom": "^7.18.1",
          zustand: "^5.0.0",
        },
        devDependencies: { vite: "^7.0.0", typescript: "~5.8.0" },
      }),
    );
    const context = await detectProject(dir);
    const availabilities = filterIntegrations(context, allRecipes);

    const routing = installedSummary(availabilities, "routing");
    expect(routing?.label).toContain("React Router");
    expect(routing?.label).toContain("^7.18.1");
    expect(routing?.partial).toBe(false);

    const state = installedSummary(availabilities, "state-management");
    expect(state?.label).toContain("Zustand");

    // Nothing ORM-related is installed, so the category has no summary.
    expect(installedSummary(availabilities, "orm")).toBeUndefined();
  });
});
