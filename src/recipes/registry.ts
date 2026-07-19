import { reactRecipe } from "./frontend/react.js";
import { vueRecipe } from "./frontend/vue.js";
import { nextRecipe } from "./frontend/next.js";
import { expressRecipe } from "./backend/express.js";
import { nestRecipe } from "./backend/nest.js";
import { fastifyRecipe } from "./backend/fastify.js";
import { honoRecipe } from "./backend/hono.js";
import { drizzleRecipe } from "./backend/drizzle.js";
import { prismaRecipe } from "./backend/prisma.js";
import { featureRecipes } from "./features/index.js";
import type { FeatureDef, Recipe } from "./types.js";

export const allRecipes: Recipe[] = [
  reactRecipe,
  vueRecipe,
  nextRecipe,
  expressRecipe,
  nestRecipe,
  fastifyRecipe,
  honoRecipe,
  drizzleRecipe,
  prismaRecipe,
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

/** Framework choices in the order the create flow presents them. */
export const frontendFrameworks: Recipe[] = [reactRecipe, vueRecipe, nextRecipe];

/** NestJS is TypeScript-only — the create flow hides it when JavaScript is chosen. */
export const backendFrameworks: Recipe[] = [
  expressRecipe,
  nestRecipe,
  fastifyRecipe,
  honoRecipe,
];

export const TS_ONLY_FRAMEWORKS = new Set(["nest"]);

export const ormRecipes: Recipe[] = [drizzleRecipe, prismaRecipe];

/**
 * Feature question slots shown after the framework questions. Adding a new
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
    supports: ["react", "next", "vue"],
    options: [
      { value: "zustand", label: "Zustand", recipeId: "zustand" },
      { value: "redux-toolkit", label: "Redux Toolkit", recipeId: "redux-toolkit" },
      { value: "jotai", label: "Jotai", recipeId: "jotai" },
      { value: "pinia", label: "Pinia", recipeId: "pinia" },
      { value: "none", label: "None", recipeId: null },
    ],
  },
  {
    id: "dataFetching",
    message: "Choose data fetching",
    supports: ["react", "next", "vue"],
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
    supports: ["react", "next"],
    options: [
      { value: "react-hook-form", label: "React Hook Form", recipeId: "react-hook-form" },
      { value: "none", label: "None", recipeId: null },
    ],
  },
  {
    id: "validation",
    message: "Choose validation",
    supports: ["react", "next", "vue", "express", "fastify", "hono", "nest"],
    options: [
      { value: "zod", label: "Zod", recipeId: "zod" },
      { value: "yup", label: "Yup", recipeId: "yup" },
      { value: "none", label: "None", recipeId: null },
    ],
  },
  {
    id: "testing",
    message: "Choose testing",
    supports: ["react", "next", "vue", "express", "fastify", "hono", "nest"],
    options: [
      { value: "vitest", label: "Vitest", recipeId: "vitest" },
      { value: "jest", label: "Jest", recipeId: "jest" },
      { value: "none", label: "None", recipeId: null },
    ],
  },
];

/**
 * Features applicable to any of the selected frameworks, with options
 * narrowed to the ones those frameworks support.
 */
export function featuresForFrameworks(frameworks: string[]): FeatureDef[] {
  if (frameworks.length === 0) return [];
  return featureDefs
    .filter((f) => f.supports.some((s) => frameworks.includes(s)))
    .map((f) => ({
      ...f,
      options: f.options.filter((o) => {
        if (o.recipeId === null) return true;
        const recipe = getRecipe(o.recipeId);
        return recipe?.supports?.some((s) => frameworks.includes(s)) ?? true;
      }),
    }))
    .filter((f) => f.options.some((o) => o.recipeId !== null));
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
