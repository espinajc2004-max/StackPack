import { formatPackage } from "../utils/package-parser.js";
import type { PackageManager } from "./detect.js";

export function packageSpecs(record: Record<string, string>): string[] {
  return Object.entries(record).map(([name, version]) =>
    formatPackage(name, version)
  );
}

export function installArgs(
  pm: PackageManager,
  specs: string[],
  dev: boolean
): string[] {
  switch (pm) {
    case "npm":
      return ["install", ...(dev ? ["--save-dev"] : []), ...specs];
    case "pnpm":
    case "yarn":
      return ["add", ...(dev ? ["-D"] : []), ...specs];
    case "bun":
      return ["add", ...(dev ? ["-d"] : []), ...specs];
  }
}

export function formatInstallCommand(
  pm: PackageManager,
  record: Record<string, string>,
  dev: boolean
): string | null {
  const specs = packageSpecs(record);
  if (specs.length === 0) return null;
  return [pm, ...installArgs(pm, specs, dev)].join(" ");
}
