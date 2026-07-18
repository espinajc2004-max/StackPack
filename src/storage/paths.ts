import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export function stackpackHome(): string {
  return process.env.STACKPACK_HOME ?? path.join(os.homedir(), ".stackpack");
}

export function presetsDir(): string {
  return path.join(stackpackHome(), "presets");
}

export function cacheDir(): string {
  return path.join(stackpackHome(), "cache");
}

export function backupsDir(): string {
  return path.join(stackpackHome(), "backups");
}

export function configPath(): string {
  return path.join(stackpackHome(), "config.json");
}

export function projectPresetsDir(cwd: string = process.cwd()): string {
  return path.join(cwd, ".stackpack");
}

export function isFirstRun(): boolean {
  return !fs.existsSync(stackpackHome());
}

export function ensureDirs(): void {
  for (const dir of [stackpackHome(), presetsDir(), cacheDir(), backupsDir()]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
