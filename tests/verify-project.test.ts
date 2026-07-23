import { afterEach, describe, expect, it } from "vitest";
import { addToSelection } from "../src/commands/selection-utils.js";
import { createEmptySelection } from "../src/dashboard/state.js";
import { buildInstallationPlan } from "../src/engine/build-plan.js";
import { detectProject } from "../src/engine/detect-project.js";
import { verifyProject } from "../src/engine/verify-project.js";
import { makeTempDir, removeDir, writeFileIn, writeViteReactProject } from "./helpers.js";

const dirs: string[] = [];

afterEach(async () => {
  while (dirs.length > 0) await removeDir(dirs.pop() as string);
});

async function shadcnPlan() {
  const project = await makeTempDir();
  dirs.push(project);
  await writeViteReactProject(project);
  const context = await detectProject(project);
  const selection = createEmptySelection();
  addToSelection(selection, "shadcn", {});
  return { project, plan: buildInstallationPlan(context, selection) };
}

async function playwrightPlan(installed: boolean) {
  const project = await makeTempDir();
  dirs.push(project);
  await writeViteReactProject(project);
  await writeFileIn(project, "playwright.config.ts", "export default {};\n");
  if (installed) {
    await writeFileIn(
      project,
      "package.json",
      `${JSON.stringify(
        {
          name: "playwright-fixture",
          version: "1.0.0",
          private: true,
          dependencies: { react: "^19.0.0", "react-dom": "^19.0.0" },
          devDependencies: {
            "@playwright/test": "^1.61.1",
            vite: "^8.0.0",
            typescript: "^6.0.0",
          },
        },
        null,
        2,
      )}\n`,
    );
  }
  const context = await detectProject(project);
  const selection = createEmptySelection();
  addToSelection(selection, "playwright", {});
  return { context, plan: buildInstallationPlan(context, selection) };
}

const runner = async () => ({ exitCode: 0, stdout: "", stderr: "" });

describe("verifyProject official initializers", () => {
  it("fails verification when an initializer exits without installing its integration", async () => {
    const { plan } = await shadcnPlan();
    const checks = await verifyProject(plan.context, plan, {
      runner,
      runCommands: false,
    });

    expect(checks).toContainEqual({
      name: "Official initializer: shadcn/ui",
      status: "failed",
      detail: "The official initializer finished but shadcn/ui was not detected afterward.",
    });
  });

  it("passes verification after the initializer's output is detected", async () => {
    const { project, plan } = await shadcnPlan();
    await writeFileIn(project, "components.json", "{}\n");
    const refreshed = await detectProject(project);
    const checks = await verifyProject(refreshed, plan, {
      runner,
      runCommands: false,
    });

    expect(checks).toContainEqual({
      name: "Official initializer: shadcn/ui",
      status: "passed",
      detail: "components.json exists.",
    });
  });

  it("fails when Playwright has only partial initializer output", async () => {
    const { context, plan } = await playwrightPlan(false);
    const checks = await verifyProject(context, plan, {
      runner,
      runCommands: false,
    });

    expect(checks).toContainEqual({
      name: "Official initializer: Playwright",
      status: "failed",
      detail: "Config exists but @playwright/test is not installed.",
    });
  });

  it("passes after the Playwright package is detected", async () => {
    const { context, plan } = await playwrightPlan(true);
    const checks = await verifyProject(context, plan, {
      runner,
      runCommands: false,
    });

    expect(checks).toContainEqual({
      name: "Official initializer: Playwright",
      status: "passed",
      detail: "@playwright/test@^1.61.1",
    });
  });
});
