import { reactRecipe } from "./frontend/react.js";
import { expressRecipe } from "./backend/express.js";
import { drizzleRecipe } from "./backend/drizzle.js";
import { featureRecipes } from "./features/index.js";
import type { FeatureDef, Recipe } from "./types.js";

export const allRecipes: Recipe[] = [
  reactRecipe,
  expressRecipe,
  drizzleRecipe,
  ...featureRecipes,
];

const byId = new Map(allRecipes.map((r) => [r.id, r]));

export function getRecipe(id: string): Recipe | undefined {
  return byId.get(id);
}

export function getRecipes(ids: string[]): Recipe[] {
  return ids
    .map((id) => byId.get(id))
    .filter((r): r is Recipe => r !== undefined);
}

export const frameworkRecipes: Record<"frontend" | "backend", Recipe[]> = {
  frontend: [reactRecipe],
  backend: [expressRecipe],
};

/**
 * Feature question slots shown after a framework's own questions. Adding a new
 * tool means adding a recipe above and one option here — no engine changes.
 */
export const featureDefs: FeatureDef[] = [
  {
    id: "router",
    message: "Choose routing",
    supports: ["react"],
    options: [
      { value: "react-router-dom", label: "React Router", recipeId: "react-router" },
      {
        value: "@tanstack/react-router",
        label: "TanStack Router",
        recipeId: "tanstack-router",
      },
      { value: "none", label: "None", recipeId: null },
    ],
  },
  {
    id: "stateManagement",
    message: "Choose state management",
    supports: ["react"],
    options: [
      { value: "zustand", label: "Zustand", recipeId: "zustand" },
      { value: "redux-toolkit", label: "Redux Toolkit", recipeId: "redux-toolkit" },
      { value: "jotai", label: "Jotai", recipeId: "jotai" },
      { value: "none", label: "None", recipeId: null },
    ],
  },
  {
    id: "dataFetching",
    message: "Choose data fetching",
    supports: ["react"],
    options: [
      { value: "tanstack-query", label: "TanStack Query", recipeId: "tanstack-query" },
      { value: "swr", label: "SWR", recipeId: "swr" },
      { value: "axios", label: "Axios only", recipeId: "axios" },
      { value: "fetch", label: "Native fetch", recipeId: null },
      { value: "none", label: "None", recipeId: null },
    ],
  },
  {
    id: "forms",
    message: "Choose form handling",
    supports: ["react"],
    options: [
      { value: "react-hook-form", label: "React Hook Form", recipeId: "react-hook-form" },
      { value: "none", label: "None", recipeId: null },
    ],
  },
  {
    id: "validation",
    message: "Choose validation",
    supports: ["react", "express"],
    options: [
      { value: "zod", label: "Zod", recipeId: "zod" },
      { value: "yup", label: "Yup", recipeId: "yup" },
      { value: "none", label: "None", recipeId: null },
    ],
  },
  {
    id: "database",
    message: "Choose a database toolkit",
    supports: ["express"],
    options: [
      { value: "drizzle", label: "Drizzle ORM", recipeId: "drizzle" },
      { value: "none", label: "None", recipeId: null },
    ],
  },
  {
    id: "testing",
    message: "Choose testing",
    supports: ["react", "express"],
    options: [
      { value: "vitest", label: "Vitest", recipeId: "vitest" },
      { value: "jest", label: "Jest", recipeId: "jest" },
      { value: "none", label: "None", recipeId: null },
    ],
  },
];

/** Options that only make sense for one framework are filtered per feature. */
export function featuresForFramework(framework: string): FeatureDef[] {
  return featureDefs
    .filter((f) => f.supports.includes(framework))
    .map((f) => ({
      ...f,
      options: f.options.filter((o) => {
        if (o.recipeId === null) return true;
        const recipe = getRecipe(o.recipeId);
        return recipe?.supports?.includes(framework) ?? true;
      }),
    }));
}

/** Curated extra packages offered after the recipe questions. */
export const curatedExtras: Array<{
  group: string;
  packages: Array<{ name: string; hint?: string }>;
}> = [
  {
    group: "Utilities",
    packages: [
      { name: "dayjs", hint: "date handling" },
      { name: "clsx", hint: "class names" },
      { name: "nanoid", hint: "unique ids" },
    ],
  },
  {
    group: "Styling",
    packages: [{ name: "tailwindcss", hint: "installed only — no config generated" }],
  },
];
