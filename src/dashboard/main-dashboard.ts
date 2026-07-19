import pc from "picocolors";
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
  runOrmCategory,
  runRoutingCategory,
  runStateManagementCategory,
  runTestingCategory,
  runUiCategory,
} from "./categories.js";
import { runCustomPackagesCategory } from "./custom-packages.js";
import { runVersionEditor } from "./version-editor.js";

function selectionLabel(entry: SelectedIntegration | undefined): string | undefined {
  if (!entry) return undefined;
  const recipe = getRecipe(entry.id);
  if (!recipe) return entry.id;
  const detail = recipe.describeOptions?.(entry.options);
  return detail ? `${recipe.name} (${detail})` : recipe.name;
}

function testingLabel(selection: SetupSelection): string | undefined {
  if (selection.testing.length === 0) return undefined;
  return selection.testing.map((entry) => getRecipe(entry.id)?.name ?? entry.id).join(" + ");
}

/** Category rows turn green with a check once something is selected. */
function categoryOption(
  value: string,
  label: string,
  selected: string | undefined,
): { value: string; label: string; hint: string } {
  return selected
    ? { value, label: `${label} ${pc.green("✓")}`, hint: pc.green(selected) }
    : { value, label, hint: "Not selected" };
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
      options.push(categoryOption("routing", "Routing", selectionLabel(selection.routing)));
    }
    options.push(
      categoryOption(
        "state-management",
        "State Management",
        selectionLabel(selection.stateManagement),
      ),
      categoryOption(
        "data-fetching",
        "Data Fetching and API",
        selectionLabel(selection.dataFetching),
      ),
      categoryOption(
        "forms-validation",
        "Forms and Validation",
        selectionLabel(selection.formsAndValidation),
      ),
      categoryOption("ui", "UI Components", selectionLabel(selection.ui)),
      categoryOption("orm", "Database / ORM", selectionLabel(selection.orm)),
      categoryOption("testing", "Testing", testingLabel(selection)),
      categoryOption(
        "custom-packages",
        "Custom Packages",
        customCount > 0 ? `${customCount} package${customCount === 1 ? "" : "s"}` : undefined,
      ),
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
      case "ui":
        await runUiCategory(selection, availabilities);
        break;
      case "orm":
        await runOrmCategory(selection, availabilities);
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
