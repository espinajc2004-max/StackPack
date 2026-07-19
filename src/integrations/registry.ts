import { recipeMetadataSchema } from "../schemas/recipe.js";
import { StackPackError } from "../utils/errors.js";
import type { IntegrationCategory, IntegrationRecipe } from "./types.js";
import { reactRouterRecipe } from "./react-router/recipe.js";
import { zustandRecipe } from "./zustand/recipe.js";
import { reduxToolkitRecipe } from "./redux-toolkit/recipe.js";
import { tanstackQueryRecipe } from "./tanstack-query/recipe.js";
import { reactHookFormZodRecipe } from "./react-hook-form-zod/recipe.js";
import { vitestReactRecipe } from "./vitest-react/recipe.js";
import { playwrightRecipe } from "./playwright/recipe.js";

export const allRecipes: IntegrationRecipe[] = [
  reactRouterRecipe,
  zustandRecipe,
  reduxToolkitRecipe,
  tanstackQueryRecipe,
  reactHookFormZodRecipe,
  vitestReactRecipe,
  playwrightRecipe,
];

const seen = new Set<string>();
for (const recipe of allRecipes) {
  const result = recipeMetadataSchema.safeParse(recipe);
  if (!result.success) {
    throw new StackPackError(`Integration recipe "${recipe.id}" has invalid metadata.`, {
      hints: result.error.issues.slice(0, 3).map((i) => `${i.path.join(".")}: ${i.message}`),
    });
  }
  if (seen.has(recipe.id)) {
    throw new StackPackError(`Duplicate integration recipe id "${recipe.id}".`);
  }
  seen.add(recipe.id);
}

export function getRecipe(id: string): IntegrationRecipe | undefined {
  return allRecipes.find((recipe) => recipe.id === id);
}

export function recipesByCategory(category: IntegrationCategory): IntegrationRecipe[] {
  return allRecipes.filter((recipe) => recipe.category === category);
}
