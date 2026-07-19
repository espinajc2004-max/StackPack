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

export type InstalledSummary = { label: string; partial: boolean };

/**
 * Project inventory per category: what is already installed in the project
 * (detected from real files/packages), independent of this session's picks.
 */
export function installedSummary(
  availabilities: IntegrationAvailability[],
  category: string,
): InstalledSummary | undefined {
  const entries = availabilities.filter(
    (a) =>
      a.recipe.category === category &&
      (a.compatibility === "already-installed" || a.compatibility === "partially-configured"),
  );
  if (entries.length === 0) return undefined;
  const label = entries
    .map((a) => {
      const version = a.detection.installedVersion;
      const base = version ? `${a.recipe.name} ${version}` : a.recipe.name;
      return a.compatibility === "partially-configured" ? `${base} — partial setup` : base;
    })
    .join(" + ");
  return { label, partial: entries.some((a) => a.compatibility === "partially-configured") };
}

/**
 * Category rows show this session's picks first (green check), otherwise what
 * the project already has installed, otherwise that the slot is open.
 */
function categoryOption(
  value: string,
  label: string,
  selected: string | undefined,
  installed?: InstalledSummary,
): { value: string; label: string; hint: string } {
  if (selected) {
    return { value, label: `${label} ${pc.green("✓")}`, hint: pc.green(selected) };
  }
  if (installed) {
    return installed.partial
      ? {
          value,
          label: `${label} ${pc.yellow("⚠")}`,
          hint: pc.yellow(`installed: ${installed.label}`),
        }
      : {
          value,
          label: `${label} ${pc.green("●")}`,
          hint: pc.dim(`installed: ${installed.label}`),
        };
  }
  return { value, label, hint: "Not installed" };
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
  options: { reviewLabel?: string } = {},
): Promise<DashboardOutcome> {
  const reviewLabel = options.reviewLabel ?? "Review and Install";
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
      options.push(
        categoryOption(
          "routing",
          "Routing",
          selectionLabel(selection.routing),
          installedSummary(availabilities, "routing"),
        ),
      );
    }
    options.push(
      categoryOption(
        "state-management",
        "State Management",
        selectionLabel(selection.stateManagement),
        installedSummary(availabilities, "state-management"),
      ),
      categoryOption(
        "data-fetching",
        "Data Fetching and API",
        selectionLabel(selection.dataFetching),
        installedSummary(availabilities, "data-fetching"),
      ),
      categoryOption(
        "forms-validation",
        "Forms and Validation",
        selectionLabel(selection.formsAndValidation),
        installedSummary(availabilities, "forms-validation"),
      ),
      categoryOption(
        "ui",
        "UI Components",
        selectionLabel(selection.ui),
        installedSummary(availabilities, "ui"),
      ),
      categoryOption(
        "orm",
        "Database / ORM",
        selectionLabel(selection.orm),
        installedSummary(availabilities, "orm"),
      ),
      categoryOption(
        "testing",
        "Testing",
        testingLabel(selection),
        installedSummary(availabilities, "testing"),
      ),
      categoryOption(
        "custom-packages",
        "Custom Packages",
        customCount > 0 ? `${customCount} package${customCount === 1 ? "" : "s"}` : undefined,
      ),
      { value: "versions", label: "Edit Package Versions" },
      { value: "review", label: reviewLabel },
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
