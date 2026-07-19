import type { CommandDefinition, PackageManager } from "../package-manager/types.js";
import type { ProjectContext } from "../schemas/project-context.js";
import type { RecipeMetadata } from "../schemas/recipe.js";

export type IntegrationCategory = RecipeMetadata["category"];

export type DependencyType = "dependency" | "devDependency";

export type PackageRequirement = {
  name: string;
  version: string;
  dependencyType: DependencyType;
  /** Why this companion package is needed (shown in the UI). */
  reason?: string;
};

export type InitializerSpec = {
  description: string;
  interactive: boolean;
  buildCommand(packageManager: PackageManager, cwd: string): CommandDefinition;
};

export type InstallationMethod =
  | { type: "official-initializer"; initializer: InitializerSpec }
  | {
      type: "official-package-install";
      dependencies: PackageRequirement[];
      devDependencies: PackageRequirement[];
    };

export type ProjectRequirement = {
  frameworks?: Array<ProjectContext["framework"]>;
  buildTools?: Array<ProjectContext["buildTool"]>;
};

export type IntegrationStatusDetected =
  "not-installed" | "installed" | "partially-configured" | "fully-configured" | "version-mismatch";

export type IntegrationDetectionResult = {
  status: IntegrationStatusDetected;
  installedVersion?: string;
  details?: string;
};

export type PlannedFile = {
  path: string;
  contents: string;
  description?: string;
};

export type PlannedScript = { name: string; command: string };

export type IntegrationPlan = {
  packages: PackageRequirement[];
  filesToCreate: PlannedFile[];
  scripts: PlannedScript[];
  postInstallNotes: string[];
  initializer?: InitializerSpec;
};

export type IntegrationRecipe = RecipeMetadata & {
  /** Short explanation of the installation method, shown in category screens. */
  installationSummary: string;
  supportedProjects: ProjectRequirement[];
  installation: InstallationMethod;
  detectInstalled(context: ProjectContext): IntegrationDetectionResult;
  createPlan(context: ProjectContext, options: Record<string, unknown>): IntegrationPlan;
  /** Human label for the current options, shown on the dashboard row. */
  describeOptions?(options: Record<string, unknown>): string | undefined;
};

export function isProjectSupported(recipe: IntegrationRecipe, context: ProjectContext): boolean {
  if (recipe.supportedProjects.length === 0) return true;
  return recipe.supportedProjects.some((req) => {
    const frameworkOk = !req.frameworks || req.frameworks.includes(context.framework);
    const buildToolOk = !req.buildTools || req.buildTools.includes(context.buildTool);
    return frameworkOk && buildToolOk;
  });
}
