import fs from "node:fs";
import path from "node:path";

export const PACKAGE_MANAGERS = ["npm", "pnpm", "yarn", "bun"] as const;
export type PackageManager = (typeof PACKAGE_MANAGERS)[number];

export function isPackageManager(value: string): value is PackageManager {
  return (PACKAGE_MANAGERS as readonly string[]).includes(value);
}

const LOCKFILES: ReadonlyArray<readonly [string, PackageManager]> = [
  ["pnpm-lock.yaml", "pnpm"],
  ["yarn.lock", "yarn"],
  ["bun.lock", "bun"],
  ["bun.lockb", "bun"],
  ["package-lock.json", "npm"],
];

export interface PmDetection {
  manager: PackageManager | null;
  source: "packageManager-field" | "lockfile" | "none";
  /** Distinct managers whose lockfiles are present; >1 means a conflict. */
  lockfileManagers: PackageManager[];
}

export function detectPackageManager(dir: string): PmDetection {
  const lockfileManagers = [
    ...new Set(
      LOCKFILES.filter(([file]) => fs.existsSync(path.join(dir, file))).map(
        ([, pm]) => pm
      )
    ),
  ];

  const pkgPath = path.join(dir, "package.json");
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      if (typeof pkg.packageManager === "string") {
        const name = pkg.packageManager.split("@")[0];
        if (isPackageManager(name)) {
          return { manager: name, source: "packageManager-field", lockfileManagers };
        }
      }
    } catch {
      // unreadable package.json — fall through to lockfile detection
    }
  }

  if (lockfileManagers.length === 1) {
    return { manager: lockfileManagers[0], source: "lockfile", lockfileManagers };
  }
  return { manager: null, source: "none", lockfileManagers };
}
