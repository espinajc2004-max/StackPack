import type { PackageJson } from "./package-json.js";

export interface Detection {
  category: string;
  label: string;
  /** Detected package name, or null when nothing matched. */
  found: string | null;
  recipeId?: string;
}

interface Detector {
  category: string;
  label: string;
  /** package name → recipe id (or null when install-only). */
  candidates: Record<string, string | null>;
}

const DETECTORS: Detector[] = [
  {
    category: "framework",
    label: "Framework",
    candidates: {
      react: "react",
      vue: null,
      svelte: null,
      express: "express",
      fastify: null,
      hono: null,
    },
  },
  {
    category: "language",
    label: "Language",
    candidates: { typescript: null },
  },
  {
    category: "buildTool",
    label: "Build tool",
    candidates: { vite: null, webpack: null },
  },
  {
    category: "router",
    label: "Routing",
    candidates: {
      "react-router-dom": "react-router",
      "@tanstack/react-router": "tanstack-router",
    },
  },
  {
    category: "stateManagement",
    label: "State management",
    candidates: {
      zustand: "zustand",
      "@reduxjs/toolkit": "redux-toolkit",
      jotai: "jotai",
    },
  },
  {
    category: "dataFetching",
    label: "Data fetching",
    candidates: {
      "@tanstack/react-query": "tanstack-query",
      swr: "swr",
      axios: "axios",
    },
  },
  {
    category: "forms",
    label: "Forms",
    candidates: { "react-hook-form": "react-hook-form" },
  },
  {
    category: "validation",
    label: "Validation",
    candidates: { zod: "zod", yup: "yup" },
  },
  {
    category: "orm",
    label: "ORM",
    candidates: { "drizzle-orm": "drizzle", prisma: null, "@prisma/client": null },
  },
  {
    category: "testing",
    label: "Testing",
    candidates: { vitest: "vitest", jest: "jest" },
  },
];

export function detectStack(pkg: PackageJson): Detection[] {
  const all = { ...pkg.dependencies, ...pkg.devDependencies };
  return DETECTORS.map((detector) => {
    const found = Object.keys(detector.candidates).find((name) => name in all);
    return {
      category: detector.category,
      label: detector.label,
      found: found ?? null,
      recipeId: found ? detector.candidates[found] ?? undefined : undefined,
    };
  });
}
