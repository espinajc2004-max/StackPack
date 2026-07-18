import type { Recipe } from "../types.js";

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
  supports: ["react"],
  dependencies: [{ packages: ["zustand"] }],
};

export const reduxToolkitRecipe: Recipe = {
  id: "redux-toolkit",
  name: "Redux Toolkit",
  category: "feature",
  feature: "stateManagement",
  supports: ["react"],
  dependencies: [
    { packages: ["@reduxjs/toolkit"] },
    { when: { framework: "react" }, packages: ["react-redux"] },
  ],
};

export const jotaiRecipe: Recipe = {
  id: "jotai",
  name: "Jotai",
  category: "feature",
  feature: "stateManagement",
  supports: ["react"],
  dependencies: [{ packages: ["jotai"] }],
};

export const tanstackQueryRecipe: Recipe = {
  id: "tanstack-query",
  name: "TanStack Query",
  category: "feature",
  feature: "dataFetching",
  supports: ["react"],
  dependencies: [{ packages: ["@tanstack/react-query"] }],
};

export const swrRecipe: Recipe = {
  id: "swr",
  name: "SWR",
  category: "feature",
  feature: "dataFetching",
  supports: ["react"],
  dependencies: [{ packages: ["swr"] }],
};

export const axiosRecipe: Recipe = {
  id: "axios",
  name: "Axios",
  category: "feature",
  feature: "dataFetching",
  supports: ["react", "express"],
  dependencies: [{ packages: ["axios"] }],
};

export const reactHookFormRecipe: Recipe = {
  id: "react-hook-form",
  name: "React Hook Form",
  category: "feature",
  feature: "forms",
  supports: ["react"],
  dependencies: [{ packages: ["react-hook-form"] }],
};

export const zodRecipe: Recipe = {
  id: "zod",
  name: "Zod",
  category: "feature",
  feature: "validation",
  supports: ["react", "express"],
  dependencies: [{ packages: ["zod"] }],
};

export const yupRecipe: Recipe = {
  id: "yup",
  name: "Yup",
  category: "feature",
  feature: "validation",
  supports: ["react"],
  dependencies: [{ packages: ["yup"] }],
};

export const vitestRecipe: Recipe = {
  id: "vitest",
  name: "Vitest",
  category: "feature",
  feature: "testing",
  supports: ["react", "express"],
  devDependencies: [
    { packages: ["vitest"] },
    {
      when: { framework: "react" },
      packages: ["jsdom", "@testing-library/react", "@testing-library/jest-dom"],
    },
    { when: { framework: "express" }, packages: ["supertest"] },
    {
      when: { framework: "express", language: "typescript" },
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
  supports: ["react", "express"],
  devDependencies: [
    { packages: ["jest"] },
    { when: { language: "typescript" }, packages: ["ts-jest", "@types/jest"] },
    {
      when: { framework: "react" },
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
  tanstackQueryRecipe,
  swrRecipe,
  axiosRecipe,
  reactHookFormRecipe,
  zodRecipe,
  yupRecipe,
  vitestRecipe,
  jestRecipe,
];
