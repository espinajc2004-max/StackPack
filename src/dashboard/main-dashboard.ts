import { guard, p } from "../ui/prompts.js";
import type { ProjectContext } from "../schemas/project-context.js";
import { filterIntegrations, type IntegrationAvailability } from "../engine/filter-integrations.js";
import { allRecipes, getRecipe } from "../integrations/registry.js";
import {
  selectedIntegrationCount,
  type SelectedIntegration,
  type SetupSelection,
} from "./state.js";
import {
  runDataFetchingCategory,
  runFormsValidationCategory,
  runRoutingCategory,
  runStateManagementCategory,
  runTestingCategory,
} from "./categories.js";
import { runCustomPackagesCategory } from "./custom-packages.js";
import { runVersionEditor } from "./version-editor.js";

function selectionLabel(entry: SelectedIntegration | undefined): string {
  if (!entry) return "Not selected";
  const recipe = getRecipe(entry.id);
  if (!recipe) return entry.id;
  const detail = recipe.describeOptions?.(entry.options);
  return detail ? `${recipe.name} (${detail})` : recipe.name;
}

function testingLabel(selection: SetupSelection): string {
  if (selection.testing.length === 0) return "Not selected";
  return selection.testing.map((entry) => getRecipe(entry.id)?.name ?? entry.id).join(" + ");
}

function categoryHasVisibleRecipes(
  availabilities: IntegrationAvailability[],
  category: string,
): boolean {
  return availabilities.some(
    (a) => a.recipe.category === category && a.compatibility !== "incompatible",
  );
}

export type DashboardOutcome = "review" | "cancelled";

/**
 * The jumpable category dashboard. Selections persist in memory while the
 * user moves between categories; nothing is installed here.
 */
export async function runDashboard(
  context: ProjectContext,
  selection: SetupSelection,
): Promise<DashboardOutcome> {
  for (;;) {
    const availabilities = filterIntegrations(context, allRecipes);
    const count = selectedIntegrationCount(selection);
    const customCount = selection.customPackages.length;
    const overrideCount = Object.keys(selection.versionOverrides).length;

    p.log.info(
      `Selected integrations: ${count}   Additional packages: ${customCount}${
        overrideCount > 0 ? `   Version overrides: ${overrideCount}` : ""
      }`,
    );

    const options: Array<{ value: string; label: string; hint?: string }> = [];
    if (categoryHasVisibleRecipes(availabilities, "routing")) {
      options.push({ value: "routing", label: "Routing", hint: selectionLabel(selection.routing) });
    }
    options.push(
      {
        value: "state-management",
        label: "State Management",
        hint: selectionLabel(selection.stateManagement),
      },
      {
        value: "data-fetching",
        label: "Data Fetching and API",
        hint: selectionLabel(selection.dataFetching),
      },
      {
        value: "forms-validation",
        label: "Forms and Validation",
        hint: selectionLabel(selection.formsAndValidation),
      },
      { value: "testing", label: "Testing", hint: testingLabel(selection) },
      {
        value: "custom-packages",
        label: "Custom Packages",
        hint: `${customCount} package${customCount === 1 ? "" : "s"}`,
      },
      { value: "versions", label: "Edit Package Versions" },
      { value: "review", label: "Review and Install" },
    );

    const choice = guard(await p.select({ message: "Choose a category", options }));

    switch (choice) {
      case "routing":
        await runRoutingCategory(selection, availabilities);
        break;
      case "state-management":
        await runStateManagementCategory(selection, availabilities);
        break;
      case "data-fetching":
        await runDataFetchingCategory(selection, availabilities);
        break;
      case "forms-validation":
        await runFormsValidationCategory(selection, availabilities);
        break;
      case "testing":
        await runTestingCategory(selection, availabilities);
        break;
      case "custom-packages":
        await runCustomPackagesCategory(selection);
        break;
      case "versions":
        await runVersionEditor(selection);
        break;
      case "review":
        return "review";
    }
  }
}
