import pc from "picocolors";
import { orBack, p } from "../ui/prompts.js";
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
      const generateStore = orBack(
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
      if (generateStore === null) return null;
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
      const devtools = orBack(
        await p.confirm({
          message: "Include TanStack Query Devtools?",
          initialValue: currentOptions.devtools !== false,
        }),
      );
      if (devtools === null) return null;
      const provider = orBack(
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
      if (provider === null) return null;
      return { devtools, configureProvider: provider === "files" };
    },
  });
  applyResult(result, (value) => {
    selection.dataFetching = value;
  });
}

export async function runUiCategory(
  selection: SetupSelection,
  availabilities: IntegrationAvailability[],
): Promise<void> {
  const result = await runSingleSelectCategory({
    title: "UI Components",
    prompt: "Choose a UI library",
    availabilities: availabilities.filter((a) => a.recipe.category === "ui"),
    current: selection.ui,
  });
  applyResult(result, (value) => {
    selection.ui = value;
  });
}

export async function runOrmCategory(
  selection: SetupSelection,
  availabilities: IntegrationAvailability[],
): Promise<void> {
  const result = await runSingleSelectCategory({
    title: "Database / ORM",
    prompt: "Choose an ORM (dependencies only; you write the setup files)",
    availabilities: availabilities.filter((a) => a.recipe.category === "orm"),
    current: selection.orm,
  });
  applyResult(result, (value) => {
    selection.orm = value;
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

  const hintFor = (availability: IntegrationAvailability): string =>
    availability.compatibility === "already-installed"
      ? `already installed${availability.detection.installedVersion ? ` at ${availability.detection.installedVersion}` : ""}`
      : availability.recipe.installationSummary;

  // A plain select (arrow keys + Enter) like every other category; the
  // space-to-toggle multiselect confused users into confirming nothing.
  const currentIds = selection.testing.map((entry) => entry.id);
  const choice = orBack(
    await p.select({
      message: "Choose testing tools",
      initialValue: currentIds.length > 1 ? "__all__" : (currentIds[0] ?? testing[0]?.recipe.id),
      options: [
        ...testing.map((availability) => ({
          value: availability.recipe.id,
          label:
            currentIds.length === 1 && currentIds[0] === availability.recipe.id
              ? `${availability.recipe.name} ${pc.green("✓")}`
              : availability.recipe.name,
          hint: hintFor(availability),
        })),
        ...(testing.length > 1
          ? [
              {
                value: "__all__",
                label:
                  testing.map((availability) => availability.recipe.name).join(" + ") +
                  (currentIds.length > 1 ? ` ${pc.green("✓")}` : ""),
                hint: "install all testing tools",
              },
            ]
          : []),
        { value: "__none__", label: "None", hint: "remove testing selections" },
        { value: "__return__", label: "Return without changes" },
      ],
    }),
  );

  if (choice === null || choice === "__return__") return;
  if (choice === "__none__") {
    selection.testing = [];
    return;
  }
  const chosen =
    choice === "__all__" ? testing.map((availability) => availability.recipe.id) : [choice];

  const next: SetupSelection["testing"] = [];
  for (const id of chosen) {
    const previous = selection.testing.find((entry) => entry.id === id);
    if (id === "vitest-react") {
      const target = orBack(
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
      if (target === null) return;
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
