import type { DependencyType, IntegrationRecipe } from "../integrations/types.js";
import { getRecipe } from "../integrations/registry.js";

export type SelectedIntegration = {
  id: string;
  options: Record<string, unknown>;
};

export type CustomPackage = {
  name: string;
  version: string;
  dependencyType: DependencyType;
};

/**
 * In-memory selection state for a dashboard session. Persists while the user
 * jumps between categories; nothing is installed until final confirmation.
 */
export type SetupSelection = {
  routing?: SelectedIntegration;
  stateManagement?: SelectedIntegration;
  dataFetching?: SelectedIntegration;
  formsAndValidation?: SelectedIntegration;
  testing: SelectedIntegration[];
  customPackages: CustomPackage[];
  versionOverrides: Record<string, string>;
};

export function createEmptySelection(): SetupSelection {
  return { testing: [], customPackages: [], versionOverrides: {} };
}

export function selectedIntegrations(selection: SetupSelection): SelectedIntegration[] {
  return [
    selection.routing,
    selection.stateManagement,
    selection.dataFetching,
    selection.formsAndValidation,
    ...selection.testing,
  ].filter((entry): entry is SelectedIntegration => entry !== undefined);
}

export function selectedIntegrationCount(selection: SetupSelection): number {
  return selectedIntegrations(selection).length;
}

/** Recipe + options pairs for every selected integration, in selection order. */
export function selectedRecipes(
  selection: SetupSelection,
): Array<{ recipe: IntegrationRecipe; options: Record<string, unknown> }> {
  return selectedIntegrations(selection).flatMap((entry) => {
    const recipe = getRecipe(entry.id);
    return recipe ? [{ recipe, options: entry.options }] : [];
  });
}

/** Package names visible in the version editor for the current selection. */
export function editablePackageNames(selection: SetupSelection): string[] {
  const names = new Set<string>();
  for (const { recipe, options } of selectedRecipes(selection)) {
    for (const pkg of recipe.createPlan(fakeContextForPackageListing(), options).packages) {
      names.add(pkg.name);
    }
  }
  for (const custom of selection.customPackages) {
    names.add(custom.name);
  }
  return [...names].sort();
}

/**
 * The version editor only needs package names, which do not depend on the
 * project; a minimal context keeps createPlan callable without a real project.
 */
function fakeContextForPackageListing(): import("../schemas/project-context.js").ProjectContext {
  return {
    rootDirectory: ".",
    framework: "react",
    buildTool: "vite",
    language: "typescript",
    packageManager: "npm",
    packageManagerCandidates: [],
    detection: "detected",
    packageJson: {},
    detectedFiles: [],
    installedPackages: {},
  };
}
