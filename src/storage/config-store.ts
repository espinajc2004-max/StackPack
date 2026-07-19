import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { getStoragePaths } from "./paths.js";
import { packageManagerSchema } from "../schemas/project-context.js";

export const configSchema = z.object({
  defaultPackageManager: packageManagerSchema.optional(),
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

export async function saveConfig(config: StackPackConfig, globalBaseDir?: string): Promise<void> {
  const { configFile } = getStoragePaths(globalBaseDir);
  await fs.mkdir(path.dirname(configFile), { recursive: true });
  await fs.writeFile(
    configFile,
    JSON.stringify(configSchema.parse(config), null, 2) + "\n",
    "utf8",
  );
}
