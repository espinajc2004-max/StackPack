import { loadPreset } from "../storage/preset-store.js";
import { renderReview } from "../ui/review.js";
import { runCommand } from "../ui/prompts.js";

export async function showCommand(name: string): Promise<void> {
  await runCommand(() => {
    const { preset, filePath } = loadPreset(name);
    console.log(renderReview(preset));
    console.log(`\nStored at\n  ${filePath}`);
    console.log(`Created ${preset.createdAt}\nUpdated ${preset.updatedAt}`);
  });
}
