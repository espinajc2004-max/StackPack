import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { detectPackageManager } from "../src/package-manager/detect.js";
import { formatInstallCommand, installArgs } from "../src/package-manager/commands.js";

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "stackpack-pm-"));
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

function write(file: string, content = "") {
  fs.writeFileSync(path.join(dir, file), content, "utf8");
}

describe("detectPackageManager", () => {
  it("returns no manager when nothing is present", () => {
    const d = detectPackageManager(dir);
    expect(d.manager).toBeNull();
    expect(d.source).toBe("none");
  });

  it.each([
    ["pnpm-lock.yaml", "pnpm"],
    ["yarn.lock", "yarn"],
    ["bun.lock", "bun"],
    ["bun.lockb", "bun"],
    ["package-lock.json", "npm"],
  ] as const)("detects %s → %s", (lockfile, pm) => {
    write(lockfile);
    const d = detectPackageManager(dir);
    expect(d.manager).toBe(pm);
    expect(d.source).toBe("lockfile");
  });

  it("reports conflicting lockfiles", () => {
    write("package-lock.json");
    write("pnpm-lock.yaml");
    const d = detectPackageManager(dir);
    expect(d.manager).toBeNull();
    expect(d.lockfileManagers.sort()).toEqual(["npm", "pnpm"]);
  });

  it("prefers the packageManager field over lockfiles", () => {
    write("yarn.lock");
    write("package.json", JSON.stringify({ packageManager: "pnpm@9.0.0" }));
    expect(detectPackageManager(dir).manager).toBe("pnpm");
  });

  it("survives a corrupt package.json", () => {
    write("package.json", "{oops");
    write("pnpm-lock.yaml");
    expect(detectPackageManager(dir).manager).toBe("pnpm");
  });
});

describe("install commands", () => {
  it("builds per-manager install args", () => {
    expect(installArgs("npm", ["react@latest"], false)).toEqual([
      "install",
      "react@latest",
    ]);
    expect(installArgs("npm", ["vite@latest"], true)).toEqual([
      "install",
      "--save-dev",
      "vite@latest",
    ]);
    expect(installArgs("pnpm", ["react@latest"], true)).toEqual([
      "add",
      "-D",
      "react@latest",
    ]);
    expect(installArgs("yarn", ["react@latest"], false)).toEqual([
      "add",
      "react@latest",
    ]);
    expect(installArgs("bun", ["react@latest"], true)).toEqual([
      "add",
      "-d",
      "react@latest",
    ]);
  });

  it("formats a preview command from a package record", () => {
    expect(
      formatInstallCommand("npm", { react: "latest", zod: "3" }, false)
    ).toBe("npm install react@latest zod@3");
    expect(formatInstallCommand("npm", {}, false)).toBeNull();
  });
});
