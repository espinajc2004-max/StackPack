import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { getStoragePaths } from "./paths.js";
import { packageManagerSchema } from "../schemas/project-context.js";

const savedCustomPackageSchema = z.object({
  name: z.string(),
  version: z.string(),
  dependencyType: z.enum(["dependency", "devDependency"]),
});

export type SavedCustomPackage = z.infer<typeof savedCustomPackageSchema>;

export const configSchema = z.object({
  defaultPackageManager: packageManagerSchema.optional(),
  /** Custom packages the user added before, offered again in future setups. */
  savedCustomPackages: z.array(savedCustomPackageSchema).optional(),
});

export type StackPackConfig = z.infer<typeof configSchema>;

export async function loadConfig(globalBaseDir?: string): Promise<StackPackConfig> {
  const { configFile } = getStoragePaths(globalBaseDir);
  try {
    const raw = await fs.readFile(configFile, "utf8");
    const parsed = configSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : {};
  } catch {
    return {};
  }
}

/** Adds or updates packages in the saved custom-package library. */
export async function rememberCustomPackages(
  packages: SavedCustomPackage[],
  globalBaseDir?: string,
): Promise<void> {
  const config = await loadConfig(globalBaseDir);
  const saved = [...(config.savedCustomPackages ?? [])];
  for (const pkg of packages) {
    const index = saved.findIndex((entry) => entry.name === pkg.name);
    if (index >= 0) saved[index] = pkg;
    else saved.push(pkg);
  }
  saved.sort((a, b) => a.name.localeCompare(b.name));
  await saveConfig({ ...config, savedCustomPackages: saved }, globalBaseDir);
}

/** Removes a package from the saved library (projects are not touched). */
export async function forgetCustomPackage(name: string, globalBaseDir?: string): Promise<void> {
  const config = await loadConfig(globalBaseDir);
  await saveConfig(
    {
      ...config,
      savedCustomPackages: (config.savedCustomPackages ?? []).filter(
        (entry) => entry.name !== name,
      ),
    },
    globalBaseDir,
  );
}

export async function saveConfig(config: StackPackConfig, globalBaseDir?: string): Promise<void> {
  const { configFile } = getStoragePaths(globalBaseDir);
  await fs.mkdir(path.dirname(configFile), { recursive: true });
  await fs.writeFile(
    configFile,
    JSON.stringify(configSchema.parse(config), null, 2) + "\n",
    "utf8",
  );
}
