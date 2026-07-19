import { guard, p } from "../ui/prompts.js";
import type { IntegrationAvailability } from "../engine/filter-integrations.js";
import { runSingleSelectCategory, type CategoryResult } from "./category-shared.js";
import type { SetupSelection } from "./state.js";

function applyResult(
  result: CategoryResult,
  set: (value: SetupSelection["routing"]) => void,
): void {
  if (result.kind === "selected") set(result.selection);
  if (result.kind === "removed") set(undefined);
}

export async function runRoutingCategory(
  selection: SetupSelection,
  availabilities: IntegrationAvailability[],
): Promise<void> {
  const result = await runSingleSelectCategory({
    title: "Routing",
    prompt: "Choose a routing integration",
    availabilities: availabilities.filter((a) => a.recipe.category === "routing"),
    current: selection.routing,
  });
  applyResult(result, (value) => {
    selection.routing = value;
  });
}

export async function runStateManagementCategory(
  selection: SetupSelection,
  availabilities: IntegrationAvailability[],
): Promise<void> {
  const result = await runSingleSelectCategory({
    title: "State Management",
    prompt: "Choose a state-management integration",
    availabilities: availabilities.filter((a) => a.recipe.category === "state-management"),
    current: selection.stateManagement,
    collectOptions: async (recipe, currentOptions) => {
      if (recipe.id !== "redux-toolkit") return {};
      const generateStore = guard(
        await p.select({
          message: "Generate basic store files?",
          initialValue: currentOptions.generateStore === true ? "yes" : "no",
          options: [
            { value: "no", label: "No, install only" },
            {
              value: "yes",
              label: "Yes",
              hint: "src/store files following the official quick start",
            },
          ],
        }),
      );
      return { generateStore: generateStore === "yes" };
    },
  });
  applyResult(result, (value) => {
    selection.stateManagement = value;
  });
}

export async function runDataFetchingCategory(
  selection: SetupSelection,
  availabilities: IntegrationAvailability[],
): Promise<void> {
  const result = await runSingleSelectCategory({
    title: "Data Fetching and API",
    prompt: "Choose an integration",
    availabilities: availabilities.filter((a) => a.recipe.category === "data-fetching"),
    current: selection.dataFetching,
    collectOptions: async (recipe, currentOptions) => {
      if (recipe.id !== "tanstack-query") return {};
      const devtools = guard(
        await p.confirm({
          message: "Include TanStack Query Devtools?",
          initialValue: currentOptions.devtools !== false,
        }),
      );
      const provider = guard(
        await p.select({
          message: "Generate QueryClient and provider files?",
          initialValue: currentOptions.configureProvider === false ? "install-only" : "files",
          options: [
            {
              value: "files",
              label: "Yes, generate provider files",
              hint: "src/lib/query-client and src/lib/query-provider; your entry file is never rewritten",
            },
            { value: "install-only", label: "Install packages only" },
          ],
        }),
      );
      return { devtools, configureProvider: provider === "files" };
    },
  });
  applyResult(result, (value) => {
    selection.dataFetching = value;
  });
}

export async function runFormsValidationCategory(
  selection: SetupSelection,
  availabilities: IntegrationAvailability[],
): Promise<void> {
  const result = await runSingleSelectCategory({
    title: "Forms and Validation",
    prompt: "Choose an integration",
    availabilities: availabilities.filter((a) => a.recipe.category === "forms-validation"),
    current: selection.formsAndValidation,
  });
  applyResult(result, (value) => {
    selection.formsAndValidation = value;
  });
}

export async function runTestingCategory(
  selection: SetupSelection,
  availabilities: IntegrationAvailability[],
): Promise<void> {
  const testing = availabilities.filter(
    (a) => a.recipe.category === "testing" && a.compatibility !== "incompatible",
  );
  if (testing.length === 0) {
    p.log.warn("No compatible testing integrations are available for this project.");
    return;
  }

  const chosen = guard(
    await p.multiselect({
      message: "Select testing integrations (space to toggle, enter to confirm)",
      required: false,
      initialValues: selection.testing.map((entry) => entry.id),
      options: testing.map((availability) => ({
        value: availability.recipe.id,
        label: availability.recipe.name,
        hint:
          availability.compatibility === "already-installed"
            ? `already installed${availability.detection.installedVersion ? ` at ${availability.detection.installedVersion}` : ""}`
            : availability.recipe.installationSummary,
      })),
    }),
  );

  const next: SetupSelection["testing"] = [];
  for (const id of chosen) {
    const previous = selection.testing.find((entry) => entry.id === id);
    if (id === "vitest-react") {
      const target = guard(
        await p.select({
          message: "What will you test?",
          initialValue: previous?.options.testTarget === "utils" ? "utils" : "components",
          options: [
            {
              value: "components",
              label: "React components",
              hint: "Vitest + jsdom + React Testing Library + matchers + user-event",
            },
            { value: "utils", label: "Utility functions only", hint: "Vitest only" },
          ],
        }),
      );
      next.push({ id, options: { testTarget: target } });
    } else if (id === "playwright") {
      p.note(
        "The official Playwright initializer will run interactively during installation.\nIt may ask its own questions, install browsers, and create config, tests, and CI files.",
        "Playwright",
      );
      next.push({ id, options: previous?.options ?? {} });
    } else {
      next.push({ id, options: previous?.options ?? {} });
    }
  }
  selection.testing = next;
}
