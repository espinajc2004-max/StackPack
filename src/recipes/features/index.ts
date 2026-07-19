import type { Recipe } from "../types.js";

const BACKENDS = ["express", "fastify", "hono", "nest"] as const;
const REACT_LIKE = ["react", "next"] as const;

export const reactRouterRecipe: Recipe = {
  id: "react-router",
  name: "React Router",
  category: "feature",
  feature: "router",
  supports: ["react"],
  dependencies: [{ packages: ["react-router-dom"] }],
};

export const tanstackRouterRecipe: Recipe = {
  id: "tanstack-router",
  name: "TanStack Router",
  category: "feature",
  feature: "router",
  supports: ["react"],
  dependencies: [{ packages: ["@tanstack/react-router"] }],
};

export const zustandRecipe: Recipe = {
  id: "zustand",
  name: "Zustand",
  category: "feature",
  feature: "stateManagement",
  supports: [...REACT_LIKE],
  dependencies: [{ packages: ["zustand"] }],
};

export const reduxToolkitRecipe: Recipe = {
  id: "redux-toolkit",
  name: "Redux Toolkit",
  category: "feature",
  feature: "stateManagement",
  supports: [...REACT_LIKE],
  dependencies: [
    { packages: ["@reduxjs/toolkit"] },
    { when: { frontend: [...REACT_LIKE] }, packages: ["react-redux"] },
  ],
};

export const jotaiRecipe: Recipe = {
  id: "jotai",
  name: "Jotai",
  category: "feature",
  feature: "stateManagement",
  supports: [...REACT_LIKE],
  dependencies: [{ packages: ["jotai"] }],
};

export const piniaRecipe: Recipe = {
  id: "pinia",
  name: "Pinia",
  category: "feature",
  feature: "stateManagement",
  supports: ["vue"],
  dependencies: [{ packages: ["pinia"] }],
};

export const tanstackQueryRecipe: Recipe = {
  id: "tanstack-query",
  name: "TanStack Query",
  category: "feature",
  feature: "dataFetching",
  supports: [...REACT_LIKE],
  dependencies: [{ packages: ["@tanstack/react-query"] }],
};

export const swrRecipe: Recipe = {
  id: "swr",
  name: "SWR",
  category: "feature",
  feature: "dataFetching",
  supports: [...REACT_LIKE],
  dependencies: [{ packages: ["swr"] }],
};

export const axiosRecipe: Recipe = {
  id: "axios",
  name: "Axios",
  category: "feature",
  feature: "dataFetching",
  supports: ["react", "next", "vue", ...BACKENDS],
  dependencies: [{ packages: ["axios"] }],
};

export const reactHookFormRecipe: Recipe = {
  id: "react-hook-form",
  name: "React Hook Form",
  category: "feature",
  feature: "forms",
  supports: [...REACT_LIKE],
  dependencies: [{ packages: ["react-hook-form"] }],
};

export const zodRecipe: Recipe = {
  id: "zod",
  name: "Zod",
  category: "feature",
  feature: "validation",
  supports: ["react", "next", "vue", ...BACKENDS],
  dependencies: [{ packages: ["zod"] }],
};

export const yupRecipe: Recipe = {
  id: "yup",
  name: "Yup",
  category: "feature",
  feature: "validation",
  supports: [...REACT_LIKE],
  dependencies: [{ packages: ["yup"] }],
};

export const vitestRecipe: Recipe = {
  id: "vitest",
  name: "Vitest",
  category: "feature",
  feature: "testing",
  supports: ["react", "next", "vue", ...BACKENDS],
  devDependencies: [
    { packages: ["vitest"] },
    {
      when: { frontend: [...REACT_LIKE] },
      packages: ["jsdom", "@testing-library/react", "@testing-library/jest-dom"],
    },
    {
      when: { frontend: "vue" },
      packages: ["jsdom", "@vue/test-utils"],
    },
    { when: { backend: [...BACKENDS] }, packages: ["supertest"] },
    {
      when: { backend: [...BACKENDS], language: "typescript" },
      packages: ["@types/supertest"],
    },
  ],
  scripts: [{ scripts: { test: "vitest" } }],
};

export const jestRecipe: Recipe = {
  id: "jest",
  name: "Jest",
  category: "feature",
  feature: "testing",
  supports: ["react", "next", ...BACKENDS],
  devDependencies: [
    { packages: ["jest"] },
    { when: { language: "typescript" }, packages: ["ts-jest", "@types/jest"] },
    {
      when: { frontend: [...REACT_LIKE] },
      packages: [
        "jest-environment-jsdom",
        "@testing-library/react",
        "@testing-library/jest-dom",
      ],
    },
  ],
  scripts: [{ scripts: { test: "jest" } }],
};

export const featureRecipes: Recipe[] = [
  reactRouterRecipe,
  tanstackRouterRecipe,
  zustandRecipe,
  reduxToolkitRecipe,
  jotaiRecipe,
  piniaRecipe,
  tanstackQueryRecipe,
  swrRecipe,
  axiosRecipe,
  reactHookFormRecipe,
  zodRecipe,
  yupRecipe,
  vitestRecipe,
  jestRecipe,
];
