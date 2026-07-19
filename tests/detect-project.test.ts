import { afterEach, describe, expect, it } from "vitest";
import { detectProject } from "../src/engine/detect-project.js";
import { detectPackageManagers } from "../src/package-manager/detect.js";
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

describe("detectPackageManagers", () => {
  it("maps lockfiles to package managers", async () => {
    const dir = await tempDir();
    await writeFileIn(dir, "pnpm-lock.yaml", "");
    expect(detectPackageManagers(dir)).toEqual(["pnpm"]);
  });

  it("reports multiple lockfiles", async () => {
    const dir = await tempDir();
    await writeFileIn(dir, "package-lock.json", "{}");
    await writeFileIn(dir, "yarn.lock", "");
    expect(detectPackageManagers(dir)).toEqual(["npm", "yarn"]);
  });

  it("detects bun via bun.lock and bun.lockb", async () => {
    const dir = await tempDir();
    await writeFileIn(dir, "bun.lockb", "");
    expect(detectPackageManagers(dir)).toEqual(["bun"]);
  });
});

describe("detectProject", () => {
  it("detects a React Vite TypeScript project", async () => {
    const dir = await tempDir();
    await writeViteReactProject(dir);
    const context = await detectProject(dir);
    expect(context.framework).toBe("react");
    expect(context.buildTool).toBe("vite");
    expect(context.language).toBe("typescript");
    expect(context.packageManager).toBe("npm");
    expect(context.detection).toBe("detected");
    expect(context.installedPackages).toHaveProperty("react");
  });

  it("detects a JavaScript React Vite project", async () => {
    const dir = await tempDir();
    await writeViteReactProject(dir, { typescript: false });
    const context = await detectProject(dir);
    expect(context.language).toBe("javascript");
  });

  it("detects a Next.js app-router project", async () => {
    const dir = await tempDir();
    await writeNextProject(dir);
    const context = await detectProject(dir);
    expect(context.framework).toBe("next");
    expect(context.buildTool).toBe("next");
    expect(context.routerType).toBe("app-router");
    expect(context.detection).toBe("detected");
  });

  it("marks ambiguous package managers", async () => {
    const dir = await tempDir();
    await writeViteReactProject(dir);
    await writeFileIn(dir, "pnpm-lock.yaml", "");
    const context = await detectProject(dir);
    expect(context.detection).toBe("ambiguous");
    expect(context.packageManagerCandidates).toEqual(["npm", "pnpm"]);
    const overridden = await detectProject(dir, { packageManagerOverride: "pnpm" });
    expect(overridden.detection).toBe("detected");
    expect(overridden.packageManager).toBe("pnpm");
  });

  it("marks unsupported projects", async () => {
    const dir = await tempDir();
    await writeFileIn(dir, "package.json", JSON.stringify({ name: "plain", dependencies: {} }));
    const context = await detectProject(dir);
    expect(context.framework).toBe("unknown");
    expect(context.detection).toBe("unsupported");
  });

  it("fails with an actionable error when package.json is missing", async () => {
    const dir = await tempDir();
    await expect(detectProject(dir)).rejects.toThrow(/package\.json was not found/);
  });
});
