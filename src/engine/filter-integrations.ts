import type { ProjectContext } from "../schemas/project-context.js";
import {
  isProjectSupported,
  type IntegrationDetectionResult,
  type IntegrationRecipe,
} from "../integrations/types.js";

export type Compatibility =
  | "compatible"
  | "compatible-with-warning"
  | "incompatible"
  | "already-installed"
  | "partially-configured";

export type IntegrationAvailability = {
  recipe: IntegrationRecipe;
  compatibility: Compatibility;
  /** Internal reason retained even when the integration is hidden. */
  reason?: string;
  detection: IntegrationDetectionResult;
};

/**
 * Evaluates every recipe against the detected project. Incompatible recipes
 * keep an explicit reason so a future info view can explain why they are
 * hidden.
 */
export function filterIntegrations(
  context: ProjectContext,
  recipes: IntegrationRecipe[],
): IntegrationAvailability[] {
  return recipes.map((recipe) => {
    if (recipe.id === "react-router" && context.framework === "next") {
      return {
        recipe,
        compatibility: "incompatible",
        reason: "React Router is unavailable because this project uses Next.js routing.",
        detection: { status: "not-installed" },
      };
    }
    if (!isProjectSupported(recipe, context)) {
      return {
        recipe,
        compatibility: "incompatible",
        reason: `${recipe.name} does not support this project type.`,
        detection: { status: "not-installed" },
      };
    }
    const detection = recipe.detectInstalled(context);
    if (detection.status === "installed" || detection.status === "fully-configured") {
      return {
        recipe,
        compatibility: "already-installed",
        reason: `${recipe.name} is already installed${
          detection.installedVersion ? ` at version ${detection.installedVersion}` : ""
        }.`,
        detection,
      };
    }
    if (detection.status === "partially-configured") {
      return {
        recipe,
        compatibility: "partially-configured",
        reason: detection.details,
        detection,
      };
    }
    return { recipe, compatibility: "compatible", detection };
  });
}
