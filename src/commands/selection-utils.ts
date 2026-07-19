import type { Preset } from "../schemas/preset.js";
import { getRecipe } from "../integrations/registry.js";
import { createEmptySelection, type SetupSelection } from "../dashboard/state.js";
import { p } from "../ui/prompts.js";

/** Places an integration into its category slot in the selection. */
export function addToSelection(
  selection: SetupSelection,
  id: string,
  options: Record<string, unknown>,
): boolean {
  const recipe = getRecipe(id);
  if (!recipe) return false;
  const entry = { id, options };
  switch (recipe.category) {
    case "routing":
      selection.routing = entry;
      return true;
    case "state-management":
      selection.stateManagement = entry;
      return true;
    case "data-fetching":
      selection.dataFetching = entry;
      return true;
    case "forms-validation":
      selection.formsAndValidation = entry;
      return true;
    case "ui":
      selection.ui = entry;
      return true;
    case "orm":
      selection.orm = entry;
      return true;
    case "testing":
      if (!selection.testing.some((existing) => existing.id === id)) {
        selection.testing.push(entry);
      }
      return true;
  }
}

/** Rebuilds a dashboard selection from a saved preset. */
export function presetToSelection(preset: Preset): SetupSelection {
  const selection = createEmptySelection();
  for (const integration of preset.integrations) {
    if (!addToSelection(selection, integration.id, integration.options)) {
      p.log.warn(
        `Preset integration "${integration.id}" is not known to this StackPack version and was skipped.`,
      );
    }
  }
  for (const [name, version] of Object.entries(preset.customPackages.dependencies)) {
    selection.customPackages.push({ name, version, dependencyType: "dependency" });
  }
  for (const [name, version] of Object.entries(preset.customPackages.devDependencies)) {
    selection.customPackages.push({ name, version, dependencyType: "devDependency" });
  }
  selection.versionOverrides = { ...preset.versionOverrides };
  return selection;
}
