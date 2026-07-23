import { guard, p } from "../ui/prompts.js";
import { detectProject } from "../engine/detect-project.js";
import { filterIntegrations } from "../engine/filter-integrations.js";
import { allRecipes } from "../integrations/registry.js";
import { createEmptySelection, selectedRecipes, type CustomPackage } from "../dashboard/state.js";
import { addToSelection } from "./selection-utils.js";
import { buildPresetFromSelection } from "./shared.js";
import { presetExists, savePreset } from "../storage/preset-store.js";
import { validatePresetName } from "../utils/names.js";
import { parsePackageSpecifier } from "../utils/package-specifier.js";
import { StackPackError } from "../utils/errors.js";
import type { ProjectContext } from "../schemas/project-context.js";
import type { SetupSelection } from "../dashboard/state.js";
import type { IntegrationAvailability } from "../engine/filter-integrations.js";

/**
 * Packages the official creators scaffold themselves. They are not saved in
 * presets because every new base project already ships them.
 */
const SCAFFOLD_PACKAGES = new Set([
  "next",
  "react",
  "react-dom",
  "vite",
  "typescript",
  "@types/react",
  "@types/react-dom",
  "@types/node",
  "eslint",
  "eslint-config-next",
  "eslint-plugin-react-hooks",
  "eslint-plugin-react-refresh",
  "@eslint/js",
  "@eslint/eslintrc",
  "globals",
  "typescript-eslint",
  "@biomejs/biome",
  "oxlint",
  "tailwindcss",
  "@tailwindcss/postcss",
  "postcss",
  "autoprefixer",
  "@vitejs/plugin-react",
  "@vitejs/plugin-react-swc",
  "@rolldown/plugin-babel",
  "babel-plugin-react-compiler",
  "@babel/core",
  "@types/babel__core",
]);

export type SkippedScannedPackage = {
  name: string;
  version: string;
  reason: string;
};

export type ProjectPresetScan = {
  selection: SetupSelection;
  availabilities: IntegrationAvailability[];
  skippedPackages: SkippedScannedPackage[];
  categoryCollisions: string[];
};

/**
 * Every dependency that is neither owned by a detected integration nor part
 * of the base scaffold is captured as a custom package, so the preset
 * reproduces the full portable tech stack. Unsupported npm specifiers are
 * reported instead of making the final preset fail schema validation.
 */
function collectExtraDependencies(
  context: ProjectContext,
  selection: SetupSelection,
): { packages: CustomPackage[]; skipped: SkippedScannedPackage[] } {
  const recipeOwned = new Set<string>();
  for (const { recipe, options } of selectedRecipes(selection)) {
    for (const pkg of recipe.createPlan(context, options).packages) {
      recipeOwned.add(pkg.name);
    }
  }
  const extras: CustomPackage[] = [];
  const skipped: SkippedScannedPackage[] = [];
  const sections: Array<[Record<string, string>, CustomPackage["dependencyType"]]> = [
    [context.packageJson.dependencies ?? {}, "dependency"],
    [context.packageJson.devDependencies ?? {}, "devDependency"],
  ];
  for (const [packages, dependencyType] of sections) {
    for (const [name, version] of Object.entries(packages)) {
      if (recipeOwned.has(name) || SCAFFOLD_PACKAGES.has(name)) continue;
      const parsed = parsePackageSpecifier(`${name}@${version}`);
      if (!parsed.ok) {
        skipped.push({ name, version, reason: parsed.reason });
        continue;
      }
      extras.push({ name, version, dependencyType });
    }
  }
  return { packages: extras, skipped };
}

/** Builds the exact selection that both `scan` and `save` use. */
export function scanProjectForPreset(context: ProjectContext): ProjectPresetScan {
  const selection = createEmptySelection();
  const availabilities = filterIntegrations(context, allRecipes);
  const occupiedCategories = new Set<string>();
  const categoryCollisions: string[] = [];

  for (const availability of availabilities) {
    if (
      availability.compatibility !== "already-installed" &&
      availability.compatibility !== "partially-configured"
    ) {
      continue;
    }
    const category = availability.recipe.category;
    if (category !== "testing" && occupiedCategories.has(category)) {
      categoryCollisions.push(availability.recipe.name);
      continue;
    }
    if (addToSelection(selection, availability.recipe.id, {}) && category !== "testing") {
      occupiedCategories.add(category);
    }
  }

  const { packages, skipped } = collectExtraDependencies(context, selection);
  selection.customPackages = packages;

  // Recognized integrations normally declare "latest" in their recipes.
  // A scanned preset must reproduce the versions in the source manifest.
  for (const { recipe, options } of selectedRecipes(selection)) {
    for (const pkg of recipe.createPlan(context, options).packages) {
      const installedVersion = context.installedPackages[pkg.name];
      if (installedVersion === undefined) continue;
      const parsed = parsePackageSpecifier(`${pkg.name}@${installedVersion}`);
      if (parsed.ok) selection.versionOverrides[pkg.name] = installedVersion;
      else skipped.push({ name: pkg.name, version: installedVersion, reason: parsed.reason });
    }
  }

  return { selection, availabilities, skippedPackages: skipped, categoryCollisions };
}

/**
 * Saves the current project's detected setup as a preset: recognized
 * integrations plus every other dependency as custom packages.
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

  const scan = scanProjectForPreset(context);
  const selection = scan.selection;
  for (const skipped of scan.skippedPackages) {
    p.log.warn(
      `Skipping ${skipped.name}@${skipped.version}: it cannot be stored in a portable preset (${skipped.reason}).`,
    );
  }
  if (scan.categoryCollisions.length > 0) {
    p.log.warn(
      `These additional detected integrations share a single-choice dashboard category and were saved as custom packages instead: ${scan.categoryCollisions.join(", ")}.`,
    );
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
  const extraCount =
    Object.keys(preset.customPackages.dependencies).length +
    Object.keys(preset.customPackages.devDependencies).length;
  p.log.success(
    `Preset saved with ${preset.integrations.length} detected integration(s) and ${extraCount} other package(s).\n  Location: ${location.filePath}`,
  );
  p.outro("Done.");
}

/** Menu version of save: asks for the preset name and storage location. */
export async function runSaveInteractive(options: { cwd?: string } = {}): Promise<void> {
  const name = guard(
    await p.text({
      message: "Preset name",
      placeholder: "my-react-stack",
      validate(value) {
        const result = validatePresetName(value ?? "");
        return result.ok ? undefined : result.reason;
      },
    }),
  ).trim();
  const scope = guard(
    await p.select({
      message: "Where should the preset be saved?",
      options: [
        { value: "global", label: "Globally", hint: "usable in every project on this device" },
        { value: "local", label: "In this project only", hint: ".stackpack/ folder" },
      ],
    }),
  );
  await runSave(name, { local: scope === "local", cwd: options.cwd });
}
