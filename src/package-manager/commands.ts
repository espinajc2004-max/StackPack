import type { CommandDefinition, PackageManager } from "./types.js";

export type PackageToInstall = { name: string; version: string };

function toSpecifiers(packages: PackageToInstall[]): string[] {
  return packages.map((pkg) => `${pkg.name}@${pkg.version}`);
}

/** Builds the official install command for the detected package manager. */
export function packageInstallCommand(
  packageManager: PackageManager,
  packages: PackageToInstall[],
  options: { dev: boolean; cwd: string },
): CommandDefinition {
  const specs = toSpecifiers(packages);
  switch (packageManager) {
    case "npm":
      return {
        command: "npm",
        args: ["install", options.dev ? "--save-dev" : "--save", ...specs],
        cwd: options.cwd,
      };
    case "pnpm":
      return {
        command: "pnpm",
        args: ["add", ...(options.dev ? ["-D"] : []), ...specs],
        cwd: options.cwd,
      };
    case "yarn":
      return {
        command: "yarn",
        args: ["add", ...(options.dev ? ["-D"] : []), ...specs],
        cwd: options.cwd,
      };
    case "bun":
      return {
        command: "bun",
        args: ["add", ...(options.dev ? ["-d"] : []), ...specs],
        cwd: options.cwd,
      };
  }
}
