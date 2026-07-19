import { guard, p } from "../ui/prompts.js";
import { detectProject } from "../engine/detect-project.js";
import { filterIntegrations } from "../engine/filter-integrations.js";
import { allRecipes } from "../integrations/registry.js";
import { createEmptySelection, selectedRecipes, type CustomPackage } from "../dashboard/state.js";
import { addToSelection } from "./selection-utils.js";
import { buildPresetFromSelection } from "./shared.js";
import { presetExists, savePreset } from "../storage/preset-store.js";
import { validatePresetName } from "../utils/names.js";
import { parseVersionSpec } from "../utils/versions.js";
import { StackPackError } from "../utils/errors.js";
import type { ProjectContext } from "../schemas/project-context.js";
import type { SetupSelection } from "../dashboard/state.js";

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

/**
 * Every dependency that is neither owned by a detected integration nor part
 * of the base scaffold is captured as a custom package, so the preset
 * reproduces the full tech stack.
 */
function collectExtraDependencies(
  context: ProjectContext,
  selection: SetupSelection,
): CustomPackage[] {
  const recipeOwned = new Set<string>();
  for (const { recipe, options } of selectedRecipes(selection)) {
    for (const pkg of recipe.createPlan(context, options).packages) {
      recipeOwned.add(pkg.name);
    }
  }
  const extras: CustomPackage[] = [];
  const sections: Array<[Record<string, string>, CustomPackage["dependencyType"]]> = [
    [context.packageJson.dependencies ?? {}, "dependency"],
    [context.packageJson.devDependencies ?? {}, "devDependency"],
  ];
  for (const [packages, dependencyType] of sections) {
    for (const [name, version] of Object.entries(packages)) {
      if (recipeOwned.has(name) || SCAFFOLD_PACKAGES.has(name)) continue;
      if (parseVersionSpec(version) === null) {
        p.log.warn(`Skipping ${name}: version "${version}" cannot be stored in a preset.`);
        continue;
      }
      extras.push({ name, version, dependencyType });
    }
  }
  return extras;
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
  selection.customPackages = collectExtraDependencies(context, selection);

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
