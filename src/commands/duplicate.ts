import * as p from "@clack/prompts";
import { loadPreset, presetExists, savePreset } from "../storage/preset-store.js";
import { slugifyPresetName, validatePresetName } from "../utils/sanitize-name.js";
import { must, runCommand } from "../ui/prompts.js";
import { SYM } from "../utils/errors.js";

export async function duplicateCommand(name: string): Promise<void> {
  await runCommand(async () => {
    const { preset } = loadPreset(name);

    const displayName = must(
      await p.text({
        message: "Name for the copy",
        initialValue: `${preset.displayName} Copy`,
        validate: (v) => {
          if (!v.trim()) return "A name is required";
          const slug = slugifyPresetName(v);
          const invalid = validatePresetName(slug);
          if (invalid) return invalid;
          if (presetExists(slug, preset.scope))
            return `A preset named "${slug}" already exists`;
          return undefined;
        },
      })
    ).trim();

    const now = new Date().toISOString();
    const copy = {
      ...preset,
      name: slugifyPresetName(displayName),
      displayName,
      createdAt: now,
      updatedAt: now,
    };
    const filePath = savePreset(copy);
    console.log(`${SYM.ok} Duplicated "${preset.name}" → ${filePath}`);
  });
}
