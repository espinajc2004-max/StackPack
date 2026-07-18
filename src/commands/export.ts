import fs from "node:fs";
import path from "node:path";
import { loadPreset } from "../storage/preset-store.js";
import { runCommand } from "../ui/prompts.js";
import { SYM } from "../utils/errors.js";

export async function exportCommand(
  name: string,
  options: { output?: string } = {}
): Promise<void> {
  await runCommand(() => {
    const { preset } = loadPreset(name);
    const outFile = path.resolve(
      process.cwd(),
      options.output ?? `${preset.name}.stackpack.json`
    );
    fs.writeFileSync(outFile, JSON.stringify(preset, null, 2) + "\n", "utf8");
    console.log(`${SYM.ok} Exported "${preset.name}" to ${outFile}`);
  });
}
