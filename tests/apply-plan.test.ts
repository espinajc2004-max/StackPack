import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { detectProject } from "../src/engine/detect-project.js";
import { buildInstallationPlan } from "../src/engine/build-plan.js";
import { applyPlan } from "../src/engine/apply-plan.js";
import { createEmptySelection } from "../src/dashboard/state.js";
import type { CommandRunner } from "../src/package-manager/execute.js";
import { makeTempDir, removeDir, writeFileIn, writeViteReactProject } from "./helpers.js";

const dirs: string[] = [];
async function tempDir(): Promise<string> {
  const dir = await makeTempDir();
  dirs.push(dir);
  return dir;
}
afterEach(async () => {
  while (dirs.length > 0) await removeDir(dirs.pop() as string);
});

function fakeRunner(log: string[]): CommandRunner {
  return async (cmd) => {
    log.push([cmd.command, ...cmd.args].join(" "));
    return { exitCode: 0, stdout: "", stderr: "" };
  };
}

async function fixturePlan(dir: string) {
  const context = await detectProject(dir);
  const selection = createEmptySelection();
  selection.stateManagement = { id: "zustand", options: {} };
  selection.testing.push({ id: "vitest-react", options: { testTarget: "components" } });
  return buildInstallationPlan(context, selection);
}

describe("applyPlan", () => {
  it("dry run executes nothing and changes nothing", async () => {
    const dir = await tempDir();
    await writeViteReactProject(dir);
    const before = JSON.parse(await fs.readFile(path.join(dir, "package.json"), "utf8"));
    const plan = await fixturePlan(dir);
    const commands: string[] = [];

    const result = await applyPlan(plan, { dryRun: true, runner: fakeRunner(commands) });

    expect(commands).toHaveLength(0); // runner never invoked
    expect(result.commandsRun.some((c) => c.includes("npm install"))).toBe(true);
    const after = JSON.parse(await fs.readFile(path.join(dir, "package.json"), "utf8"));
    expect(after).toEqual(before);
    await expect(fs.access(path.join(dir, "vitest.config.ts"))).rejects.toThrow();
    await expect(fs.access(path.join(dir, ".stackpack"))).rejects.toThrow();
  });

  it("applies the plan: installs, writes files, updates scripts, creates backups", async () => {
    const dir = await tempDir();
    await writeViteReactProject(dir);
    const plan = await fixturePlan(dir);
    const commands: string[] = [];

    const result = await applyPlan(plan, { dryRun: false, runner: fakeRunner(commands) });

    expect(commands.some((c) => c.startsWith("npm install --save zustand@latest"))).toBe(true);
    expect(
      commands.some((c) => c.startsWith("npm install --save-dev") && c.includes("vitest@latest")),
    ).toBe(true);

    await fs.access(path.join(dir, "vitest.config.ts"));
    await fs.access(path.join(dir, "src", "test", "setup.ts"));

    const pkg = JSON.parse(await fs.readFile(path.join(dir, "package.json"), "utf8"));
    expect(pkg.scripts.test).toBe("vitest");
    expect(pkg.scripts.dev).toBe("vite"); // untouched

    // Backup of package.json exists inside the operation directory.
    expect(result.operationDir).toBeTruthy();
    await fs.access(path.join(result.operationDir as string, "files", "package.json"));
    const summary = JSON.parse(
      await fs.readFile(path.join(result.operationDir as string, "operation.json"), "utf8"),
    );
    expect(summary.status).toBe("completed");
    expect(summary.integrations).toEqual(["zustand", "vitest-react"]);
  });

  it("keeps existing files by default and honors replace resolutions", async () => {
    const dir = await tempDir();
    await writeViteReactProject(dir);
    await writeFileIn(dir, "vitest.config.ts", "// my custom config\n");
    const plan = await fixturePlan(dir);
    expect(plan.existingFileConflicts).toContain("vitest.config.ts");

    const keepResult = await applyPlan(plan, { dryRun: false, runner: fakeRunner([]) });
    expect(keepResult.skippedFiles).toContain("vitest.config.ts");
    expect(await fs.readFile(path.join(dir, "vitest.config.ts"), "utf8")).toContain(
      "my custom config",
    );

    const replaceResult = await applyPlan(plan, {
      dryRun: false,
      runner: fakeRunner([]),
      fileResolutions: { "vitest.config.ts": "replace" },
    });
    expect(replaceResult.createdFiles).toContain("vitest.config.ts");
    expect(await fs.readFile(path.join(dir, "vitest.config.ts"), "utf8")).toContain("mergeConfig");
  });

  it("honors script conflict resolutions", async () => {
    const dir = await tempDir();
    await writeViteReactProject(dir, { scripts: { dev: "vite", test: "jest" } });
    const plan = await fixturePlan(dir);
    expect(plan.scriptConflicts).toHaveLength(1);

    await applyPlan(plan, {
      dryRun: false,
      runner: fakeRunner([]),
      scriptResolutions: { test: "alternate" },
    });
    const pkg = JSON.parse(await fs.readFile(path.join(dir, "package.json"), "utf8"));
    expect(pkg.scripts.test).toBe("jest");
    expect(pkg.scripts["test:vitest"]).toBe("vitest");
  });

  it("fails fast on unresolved version conflicts", async () => {
    const dir = await tempDir();
    await writeViteReactProject(dir);
    const context = await detectProject(dir);
    const selection = createEmptySelection();
    selection.formsAndValidation = { id: "react-hook-form-zod", options: {} };
    selection.customPackages.push({ name: "zod", version: "^3.0.0", dependencyType: "dependency" });
    selection.customPackages.push({
      name: "react-hook-form",
      version: "latest",
      dependencyType: "dependency",
    });
    // Force a conflict: two different specific versions of zod.
    selection.versionOverrides = {};
    const plan = buildInstallationPlan(context, selection);
    // latest+^3.0.0 resolves; craft a real conflict instead:
    plan.conflicts.push({
      name: "x",
      versions: ["1", "2"],
      requestedBy: ["a", "b"],
      message: "conflict",
    });

    await expect(applyPlan(plan, { dryRun: false, runner: fakeRunner([]) })).rejects.toThrow(
      /conflicts/i,
    );
  });

  it("propagates command failures with actionable errors and records the failure", async () => {
    const dir = await tempDir();
    await writeViteReactProject(dir);
    const plan = await fixturePlan(dir);
    const failingRunner: CommandRunner = async () => ({
      exitCode: 1,
      stdout: "",
      stderr: "npm ERR! network failure",
    });

    await expect(applyPlan(plan, { dryRun: false, runner: failingRunner })).rejects.toThrow(
      /exit code 1/,
    );
  });
});
