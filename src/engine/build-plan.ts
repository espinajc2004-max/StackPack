import type { ProjectContext } from "../schemas/project-context.js";
import type {
  InitializerSpec,
  IntegrationPlan,
  IntegrationRecipe,
  PlannedFile,
  PlannedJsonEdit,
  PlannedScript,
} from "../integrations/types.js";
import { resolveExecutionOrder } from "./resolve-order.js";
import {
  resolveDependencies,
  type DependencyConflict,
  type RequestedPackage,
  type ResolvedPackage,
} from "./resolve-dependencies.js";
import {
  findExistingFiles,
  findScriptConflicts,
  type ScriptConflict,
} from "../project/conflicts.js";
import { selectedRecipes, type SetupSelection } from "../dashboard/state.js";

export type PlannedIntegration = {
  recipe: IntegrationRecipe;
  options: Record<string, unknown>;
  plan: IntegrationPlan;
};

export type InstallationPlan = {
  context: ProjectContext;
  integrations: PlannedIntegration[];
  dependencies: ResolvedPackage[];
  devDependencies: ResolvedPackage[];
  conflicts: DependencyConflict[];
  filesToCreate: PlannedFile[];
  jsonEdits: PlannedJsonEdit[];
  /** Files StackPack itself plans to modify (not counting official tools). */
  filesToModify: string[];
  scripts: PlannedScript[];
  scriptConflicts: ScriptConflict[];
  existingFileConflicts: string[];
  initializers: Array<{ id: string; name: string; initializer: InitializerSpec }>;
  warnings: string[];
  notes: string[];
};

/**
 * Builds the complete installation plan for review. Pure planning: nothing is
 * installed or written here.
 */
export function buildInstallationPlan(
  context: ProjectContext,
  selection: SetupSelection,
): InstallationPlan {
  const chosen = selectedRecipes(selection);
  const ordered = resolveExecutionOrder(chosen.map(({ recipe }) => recipe)).map(
    (recipe) => chosen.find((c) => c.recipe.id === recipe.id) as (typeof chosen)[number],
  );

  const integrations: PlannedIntegration[] = ordered.map(({ recipe, options }) => ({
    recipe,
    options,
    plan: recipe.createPlan(context, options),
  }));

  const requirements: RequestedPackage[] = [];
  for (const { recipe, plan } of integrations) {
    for (const pkg of plan.packages) {
      requirements.push({ ...pkg, requestedBy: recipe.name });
    }
  }
  for (const custom of selection.customPackages) {
    requirements.push({
      name: custom.name,
      version: custom.version,
      dependencyType: custom.dependencyType,
      requestedBy: "custom package",
    });
  }

  const resolution = resolveDependencies({
    requirements,
    versionOverrides: selection.versionOverrides,
    installedPackages: context.installedPackages,
  });

  const filesToCreate = integrations.flatMap(({ plan }) => plan.filesToCreate);
  const jsonEdits = integrations.flatMap(({ plan }) => plan.jsonEdits ?? []);
  const scripts = integrations.flatMap(({ plan }) => plan.scripts);
  const initializers = integrations.flatMap(({ recipe, plan }) =>
    plan.initializer ? [{ id: recipe.id, name: recipe.name, initializer: plan.initializer }] : [],
  );

  const filesToModify: string[] = [];
  if (resolution.packages.length > 0 || scripts.length > 0) {
    filesToModify.push("package.json");
  }
  filesToModify.push(...jsonEdits.map((edit) => edit.path));

  const warnings = [...resolution.warnings];
  if (initializers.length > 0) {
    warnings.push("Official initializers may create additional files StackPack cannot predict.");
  }

  return {
    context,
    integrations,
    dependencies: resolution.packages.filter((p) => p.dependencyType === "dependency"),
    devDependencies: resolution.packages.filter((p) => p.dependencyType === "devDependency"),
    conflicts: resolution.conflicts,
    filesToCreate,
    jsonEdits,
    filesToModify,
    scripts,
    scriptConflicts: findScriptConflicts(context.packageJson.scripts, {
      ...Object.fromEntries(scripts.map((s) => [s.name, s.command])),
    }),
    existingFileConflicts: findExistingFiles(
      context.rootDirectory,
      filesToCreate.map((f) => f.path),
    ),
    initializers,
    warnings,
    notes: integrations.flatMap(({ plan }) => plan.postInstallNotes),
  };
}
