import fs from "node:fs";
import path from "node:path";
import { execa } from "execa";
import {
  ensureDirs,
  presetsDir,
  projectPresetsDir,
  stackpackHome,
} from "../storage/paths.js";
import { parsePresetJson } from "../storage/preset-store.js";
import { detectPackageManager, PACKAGE_MANAGERS } from "../package-manager/detect.js";
import { SYM } from "../utils/errors.js";
import { runCommand } from "../ui/prompts.js";

async function pmVersion(pm: string): Promise<string | null> {
  try {
    const { stdout } = await execa(pm, ["--version"], { timeout: 10_000 });
    return stdout.trim();
  } catch {
    return null;
  }
}

function checkPresets(dir: string): { valid: number; invalid: string[] } {
  const result = { valid: 0, invalid: [] as string[] };
  if (!fs.existsSync(dir)) return result;
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith(".json")) continue;
    try {
      parsePresetJson(file, fs.readFileSync(path.join(dir, file), "utf8"));
      result.valid++;
    } catch {
      result.invalid.push(file);
    }
  }
  return result;
}

export async function doctorCommand(): Promise<void> {
  await runCommand(async () => {
    console.log("┌  StackPack Doctor\n");
    const lines: string[] = [];

    const [major] = process.versions.node.split(".").map(Number);
    lines.push(
      major >= 18
        ? `${SYM.ok} Node.js ${process.versions.node} detected`
        : `${SYM.err} Node.js ${process.versions.node} is too old — 18.17 or newer is required`
    );

    for (const pm of PACKAGE_MANAGERS) {
      const version = await pmVersion(pm);
      if (version) lines.push(`${SYM.ok} ${pm} ${version} detected`);
      else if (pm === "npm") lines.push(`${SYM.err} npm not found`);
    }

    try {
      ensureDirs();
      const probe = path.join(stackpackHome(), ".write-probe");
      fs.writeFileSync(probe, "ok");
      fs.rmSync(probe);
      lines.push(`${SYM.ok} Preset directory writable (${presetsDir()})`);
    } catch {
      lines.push(`${SYM.err} Preset directory is not writable (${presetsDir()})`);
    }

    const globalCheck = checkPresets(presetsDir());
    const localCheck = checkPresets(projectPresetsDir());
    const valid = globalCheck.valid + localCheck.valid;
    const invalid = [...globalCheck.invalid, ...localCheck.invalid];
    lines.push(`${SYM.ok} ${valid} preset${valid === 1 ? "" : "s"} valid`);
    for (const file of invalid) {
      lines.push(`${SYM.warn} ${file} is invalid or uses an unsupported schema`);
    }

    const detection = detectPackageManager(process.cwd());
    if (detection.lockfileManagers.length > 1) {
      lines.push(
        `${SYM.warn} Conflicting lockfiles in this project: ${detection.lockfileManagers.join(", ")}`
      );
    }

    console.log(lines.map((l) => `  ${l}`).join("\n"));
  });
}
