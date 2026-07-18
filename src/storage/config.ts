import fs from "node:fs";
import { z } from "zod";
import { configPath, ensureDirs } from "./paths.js";

const configSchema = z.object({
  defaultPackageManager: z.enum(["npm", "pnpm", "yarn", "bun"]).optional(),
});

export type StackPackConfig = z.infer<typeof configSchema>;

export function loadConfig(): StackPackConfig {
  const file = configPath();
  if (!fs.existsSync(file)) return {};
  try {
    const parsed = configSchema.safeParse(JSON.parse(fs.readFileSync(file, "utf8")));
    return parsed.success ? parsed.data : {};
  } catch {
    return {};
  }
}

export function saveConfig(config: StackPackConfig): void {
  ensureDirs();
  fs.writeFileSync(configPath(), JSON.stringify(config, null, 2) + "\n", "utf8");
}
