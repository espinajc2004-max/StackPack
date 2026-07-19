import pc from "picocolors";
import { guard, p } from "../ui/prompts.js";
import type { IntegrationAvailability } from "../engine/filter-integrations.js";
import type { IntegrationRecipe } from "../integrations/types.js";
import type { SelectedIntegration } from "./state.js";

export type CategoryResult =
  | { kind: "unchanged" }
  | { kind: "removed" }
  | { kind: "selected"; selection: SelectedIntegration };

export function describeInstallation(recipe: IntegrationRecipe): string {
  const lines = [`Installation method\n  ${recipe.installationSummary}`];
  if (recipe.installation.type === "official-package-install") {
    const all = [...recipe.installation.dependencies, ...recipe.installation.devDependencies];
    if (all.length > 0) {
      lines.push(
        `Packages\n${all
          .map(
            (pkg) =>
              `  ${pkg.name}@${pc.green(pkg.version)}${pkg.reason ? ` — ${pkg.reason}` : ""}`,
          )
          .join("\n")}`,
      );
    }
  } else {
    lines.push(recipe.installation.initializer.description);
  }
  return lines.join("\n\n");
}

/**
 * Shared single-select category screen: pick one integration, None to remove,
 * or return without changes. Selecting an already-installed integration offers
 * keep/complete choices instead of pretending it is new.
 */
export async function runSingleSelectCategory(params: {
  title: string;
  prompt: string;
  availabilities: IntegrationAvailability[];
  current?: SelectedIntegration;
  collectOptions?: (
    recipe: IntegrationRecipe,
    currentOptions: Record<string, unknown>,
  ) => Promise<Record<string, unknown>>;
}): Promise<CategoryResult> {
  const visible = params.availabilities.filter((a) => a.compatibility !== "incompatible");
  if (visible.length === 0) {
    p.log.warn("No compatible integrations are available in this category.");
    return { kind: "unchanged" };
  }

  const choice = guard(
    await p.select({
      message: params.prompt,
      initialValue: params.current?.id ?? visible[0]?.recipe.id,
      options: [
        ...visible.map((availability) => {
          const isCurrent = params.current?.id === availability.recipe.id;
          const hint =
            availability.compatibility === "already-installed"
              ? `already installed${availability.detection.installedVersion ? ` at ${availability.detection.installedVersion}` : ""}`
              : availability.compatibility === "partially-configured"
                ? "installed but not fully configured"
                : availability.recipe.installationSummary;
          return {
            value: availability.recipe.id,
            label: isCurrent
              ? `${availability.recipe.name} ${pc.green("✓")}`
              : availability.recipe.name,
            hint: isCurrent ? pc.green("currently selected") : hint,
          };
        }),
        { value: "__none__", label: "None", hint: "Remove the current selection" },
        { value: "__return__", label: "Return without changes" },
      ],
    }),
  );

  if (choice === "__return__") return { kind: "unchanged" };
  if (choice === "__none__") return { kind: "removed" };

  const availability = visible.find((a) => a.recipe.id === choice);
  if (!availability) return { kind: "unchanged" };
  const recipe = availability.recipe;

  if (availability.compatibility === "already-installed") {
    const action = guard(
      await p.select({
        message: `${recipe.name} is already installed. What would you like to do?`,
        options: [
          { value: "keep", label: "Keep current setup", hint: "No changes planned" },
          {
            value: "reinstall",
            label: "Update or complete configuration",
            hint: "Plan it again with official packages and files",
          },
          { value: "remove", label: "Remove from current selection" },
        ],
      }),
    );
    if (action === "keep") return { kind: "unchanged" };
    if (action === "remove") return { kind: "removed" };
  }

  p.note(describeInstallation(recipe), recipe.name);

  const options = params.collectOptions
    ? await params.collectOptions(
        recipe,
        params.current?.id === recipe.id ? params.current.options : {},
      )
    : {};

  // Picking an integration selects it right away; "None" in the category
  // list is the way to undo a selection.
  p.log.success(`${recipe.name} selected`);
  return { kind: "selected", selection: { id: recipe.id, options } };
}
