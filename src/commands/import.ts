import fs from "node:fs";
import path from "node:path";
import * as p from "@clack/prompts";
import {
  parsePresetJson,
  presetExists,
  savePreset,
} from "../storage/preset-store.js";
import { StackPackError, SYM } from "../utils/errors.js";
import { must, runCommand } from "../ui/prompts.js";

export async function importCommand(file: string): Promise<void> {
  await runCommand(async () => {
    const abs = path.resolve(process.cwd(), file);
    if (!fs.existsSync(abs)) {
      throw new StackPackError(`File not found: ${file}`);
    }

    const preset = parsePresetJson(
      path.basename(file),
      fs.readFileSync(abs, "utf8")
    );

    if (presetExists(preset.name, "global")) {
      const overwrite = must(
        await p.confirm({
          message: `${SYM.warn} A preset named "${preset.name}" already exists. Overwrite it?`,
          initialValue: false,
        })
      );
      if (!overwrite) {
        console.log("Nothing imported.");
        return;
      }
    }

    savePreset({
      ...preset,
      scope: "global",
      updatedAt: new Date().toISOString(),
    });
    console.log(
      `${SYM.ok} Imported "${preset.displayName}". Install it with: stackpack install ${preset.name}`
    );
  });
}
