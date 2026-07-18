import { execa } from "execa";
import { StackPackError } from "../utils/errors.js";
import { installArgs, packageSpecs } from "./commands.js";
import type { PackageManager } from "./detect.js";

export async function runInstall(
  pm: PackageManager,
  record: Record<string, string>,
  dev: boolean,
  cwd: string
): Promise<void> {
  const specs = packageSpecs(record);
  if (specs.length === 0) return;
  const args = installArgs(pm, specs, dev);
  try {
    await execa(pm, args, { cwd, stdio: "inherit" });
  } catch {
    throw new StackPackError(
      `Installation failed\n\nCommand:\n${pm} ${args.join(" ")}`,
      "StackPack did not modify the remaining configuration files."
    );
  }
}
