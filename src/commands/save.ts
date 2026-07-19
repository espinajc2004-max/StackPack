import { guard, p } from "../ui/prompts.js";
import { detectProject } from "../engine/detect-project.js";
import { filterIntegrations } from "../engine/filter-integrations.js";
import { allRecipes } from "../integrations/registry.js";
import { createEmptySelection } from "../dashboard/state.js";
import { addToSelection } from "./selection-utils.js";
import { buildPresetFromSelection } from "./shared.js";
import { presetExists, savePreset } from "../storage/preset-store.js";
import { validatePresetName } from "../utils/names.js";
import { StackPackError } from "../utils/errors.js";

/**
 * Saves the current project's detected setup as a preset. Only integrations
 * StackPack can recognize are included.
 */
export async function runSave(
  name: string,
  options: { local?: boolean; global?: boolean; cwd?: string },
): Promise<void> {
  const cwd = options.cwd ?? process.cwd();
  p.intro("StackPack — save preset");

  const validation = validatePresetName(name);
  if (!validation.ok) throw new StackPackError(`Invalid preset name: ${validation.reason}`);

  const context = await detectProject(cwd);
  if (context.framework === "unknown" || context.language === "unknown") {
    throw new StackPackError("This project cannot be saved as a preset.", {
      hints: ["StackPack could not detect a supported framework and language."],
    });
  }

  const selection = createEmptySelection();
  const availabilities = filterIntegrations(context, allRecipes);
  for (const availability of availabilities) {
    if (
      availability.compatibility === "already-installed" ||
      availability.compatibility === "partially-configured"
    ) {
      addToSelection(selection, availability.recipe.id, {});
    }
  }

  const scope: "global" | "local" = options.local ? "local" : "global";
  const preset = buildPresetFromSelection({ name, scope, context, selection });
  if (!preset) {
    throw new StackPackError("This project cannot be represented as a preset.");
  }

  const storeOptions = { projectRoot: cwd };
  if (await presetExists(name, scope, storeOptions)) {
    const choice = guard(
      await p.select({
        message: `Preset "${name}" already exists`,
        options: [
          { value: "cancel", label: "Cancel" },
          { value: "replace", label: "Replace it" },
        ],
      }),
    );
    if (choice === "cancel") {
      p.outro("Nothing was saved.");
      return;
    }
  }

  const location = await savePreset(preset, scope, storeOptions);
  p.log.success(
    `Preset saved with ${preset.integrations.length} detected integration(s).\n  Location: ${location.filePath}`,
  );
  p.outro("Done.");
}
