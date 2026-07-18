import * as p from "@clack/prompts";
import { deletePreset, loadPreset } from "../storage/preset-store.js";
import { must, runCommand } from "../ui/prompts.js";
import { SYM } from "../utils/errors.js";

export async function deleteCommand(
  name: string,
  options: { yes?: boolean } = {}
): Promise<void> {
  await runCommand(async () => {
    const { preset, scope } = loadPreset(name);

    if (!options.yes) {
      const confirmed = must(
        await p.select({
          message: `Delete "${preset.displayName}"? This removes the local preset file.`,
          options: [
            { value: false, label: "No, keep it" },
            { value: true, label: "Yes, delete it" },
          ],
        })
      );
      if (!confirmed) {
        console.log("Nothing deleted.");
        return;
      }
    }

    deletePreset(name, scope);
    console.log(
      `${SYM.ok} Deleted preset "${name}" (a backup copy was kept in the backups directory).`
    );
  });
}
