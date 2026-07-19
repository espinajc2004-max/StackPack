import os from "node:os";
import path from "node:path";

export type StoragePaths = {
  home: string;
  presetsDir: string;
  backupsDir: string;
  cacheDir: string;
  configFile: string;
};

/**
 * Global StackPack storage under the user's home directory.
 * STACKPACK_HOME overrides the base directory (used by tests).
 */
export function getStoragePaths(baseDir?: string): StoragePaths {
  const home = baseDir ?? process.env.STACKPACK_HOME ?? path.join(os.homedir(), ".stackpack");
  return {
    home,
    presetsDir: path.join(home, "presets"),
    backupsDir: path.join(home, "backups"),
    cacheDir: path.join(home, "cache"),
    configFile: path.join(home, "config.json"),
  };
}

/** Project-local StackPack directory (may be committed to Git). */
export function getProjectLocalDir(projectRoot: string): string {
  return path.join(projectRoot, ".stackpack");
}

export function getProjectLocalPresetsDir(projectRoot: string): string {
  return getProjectLocalDir(projectRoot);
}

export function getProjectBackupsDir(projectRoot: string): string {
  return path.join(getProjectLocalDir(projectRoot), "backups");
}
