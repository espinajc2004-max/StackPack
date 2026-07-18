import fs from "node:fs/promises";
import path from "node:path";

export interface PackageJson {
  name?: string;
  version?: string;
  private?: boolean;
  packageManager?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  [key: string]: unknown;
}

export async function readPackageJson(dir: string): Promise<PackageJson | null> {
  try {
    return JSON.parse(await fs.readFile(path.join(dir, "package.json"), "utf8"));
  } catch {
    return null;
  }
}

export async function writePackageJson(dir: string, pkg: PackageJson): Promise<void> {
  await fs.writeFile(
    path.join(dir, "package.json"),
    JSON.stringify(pkg, null, 2) + "\n",
    "utf8"
  );
}

export async function createMinimalPackageJson(dir: string): Promise<PackageJson> {
  const pkg: PackageJson = {
    name: path
      .basename(path.resolve(dir))
      .toLowerCase()
      .replace(/[^a-z0-9-_.]/g, "-"),
    version: "0.1.0",
    private: true,
  };
  await writePackageJson(dir, pkg);
  return pkg;
}

export interface ScriptMergeResult {
  added: string[];
  skipped: string[];
}

export async function mergeScripts(
  dir: string,
  scripts: Record<string, string>,
  force: boolean
): Promise<ScriptMergeResult> {
  const result: ScriptMergeResult = { added: [], skipped: [] };
  const entries = Object.entries(scripts);
  if (entries.length === 0) return result;

  const pkg = (await readPackageJson(dir)) ?? {};
  pkg.scripts = pkg.scripts ?? {};
  for (const [key, value] of entries) {
    if (key in pkg.scripts && pkg.scripts[key] !== value && !force) {
      result.skipped.push(key);
      continue;
    }
    pkg.scripts[key] = value;
    result.added.push(key);
  }
  await writePackageJson(dir, pkg);
  return result;
}
