import { describe, expect, it } from "vitest";
import { matchesCondition, resolvePlan } from "../src/engine/resolve.js";
import { featuresForFrameworks, getRecipes } from "../src/recipes/registry.js";
import type { Recipe } from "../src/recipes/types.js";

describe("matchesCondition", () => {
  it("matches when no condition is given", () => {
    expect(matchesCondition(undefined, {})).toBe(true);
  });

  it("requires every key to match", () => {
    const answers = { language: "typescript", buildTool: "vite" };
    expect(matchesCondition({ language: "typescript" }, answers)).toBe(true);
    expect(
      matchesCondition({ language: "typescript", buildTool: "vite" }, answers)
    ).toBe(true);
    expect(matchesCondition({ language: "javascript" }, answers)).toBe(false);
  });

  it("treats arrays as any-of", () => {
    expect(
      matchesCondition({ language: ["typescript", "javascript"] }, { language: "javascript" })
    ).toBe(true);
    expect(
      matchesCondition({ language: ["typescript"] }, { language: "javascript" })
    ).toBe(false);
  });
});

describe("resolvePlan with real recipes", () => {
  it("resolves a React + TypeScript + Vite stack", () => {
    const recipes = getRecipes(["react", "react-router", "zustand", "vitest"]);
    const plan = resolvePlan(recipes, {
      frontend: "react",
      language: "typescript",
      buildTool: "vite",
      reactCompiler: false,
    });

    expect(Object.keys(plan.dependencies)).toEqual(
      expect.arrayContaining(["react", "react-dom", "react-router-dom", "zustand"])
    );
    expect(Object.keys(plan.devDependencies)).toEqual(
      expect.arrayContaining([
        "vite",
        "@vitejs/plugin-react",
        "typescript",
        "@types/react",
        "vitest",
        "jsdom",
        "@testing-library/react",
      ])
    );
    expect(plan.devDependencies).not.toHaveProperty("supertest");
    expect(plan.files.map((f) => f.path)).toEqual(
      expect.arrayContaining(["vite.config.ts", "tsconfig.json", "src/main.tsx"])
    );
    expect(plan.scripts.dev).toBe("vite");
    expect(plan.scripts.build).toBe("tsc -b && vite build");
    expect(plan.scripts.test).toBe("vitest");
  });

  it("enables React Compiler config only when selected", () => {
    const recipes = getRecipes(["react"]);
    const base = {
      frontend: "react",
      language: "typescript",
      buildTool: "vite",
    };

    const without = resolvePlan(recipes, { ...base, reactCompiler: false });
    expect(without.devDependencies).not.toHaveProperty("babel-plugin-react-compiler");

    const withCompiler = resolvePlan(recipes, { ...base, reactCompiler: true });
    expect(withCompiler.devDependencies).toHaveProperty("babel-plugin-react-compiler");
    expect(
      withCompiler.files.find((f) => f.path === "vite.config.ts")?.content
    ).toContain("babel-plugin-react-compiler");
  });

  it("resolves Express JavaScript vs TypeScript variants from one recipe", () => {
    const recipes = getRecipes(["express"]);

    const js = resolvePlan(recipes, { backend: "express", language: "javascript" });
    expect(js.devDependencies).toHaveProperty("nodemon");
    expect(js.devDependencies).not.toHaveProperty("typescript");
    expect(js.files.map((f) => f.path)).toContain("src/server.js");
    expect(js.scripts.dev).toBe("nodemon src/server.js");

    const ts = resolvePlan(recipes, { backend: "express", language: "typescript" });
    expect(ts.devDependencies).toHaveProperty("typescript");
    expect(ts.devDependencies).toHaveProperty("@types/express");
    expect(ts.scripts.dev).toBe("tsx watch src/server.ts");
  });

  it("resolves a Vue stack", () => {
    const plan = resolvePlan(getRecipes(["vue", "pinia", "vitest"]), {
      frontend: "vue",
      language: "typescript",
    });
    expect(plan.dependencies).toHaveProperty("vue");
    expect(plan.dependencies).toHaveProperty("pinia");
    expect(plan.devDependencies).toHaveProperty("@vitejs/plugin-vue");
    expect(plan.devDependencies).toHaveProperty("vue-tsc");
    expect(plan.devDependencies).toHaveProperty("@vue/test-utils");
    expect(plan.devDependencies).not.toHaveProperty("@testing-library/react");
    expect(plan.files.map((f) => f.path)).toContain("src/App.vue");
    expect(plan.scripts.build).toBe("vue-tsc -b && vite build");
  });

  it("resolves a Next.js stack", () => {
    const plan = resolvePlan(getRecipes(["next", "zustand"]), {
      frontend: "next",
      language: "typescript",
    });
    expect(plan.dependencies).toHaveProperty("next");
    expect(plan.dependencies).toHaveProperty("react");
    expect(plan.dependencies).toHaveProperty("zustand");
    expect(plan.files.map((f) => f.path)).toEqual(
      expect.arrayContaining(["next.config.mjs", "app/layout.tsx", "app/page.tsx"])
    );
    expect(plan.scripts.dev).toBe("next dev");
  });

  it("resolves a NestJS stack (TypeScript only)", () => {
    const plan = resolvePlan(getRecipes(["nest"]), {
      backend: "nest",
      language: "typescript",
    });
    expect(plan.dependencies).toHaveProperty("@nestjs/core");
    expect(plan.devDependencies).toHaveProperty("@nestjs/cli");
    expect(plan.files.map((f) => f.path)).toEqual(
      expect.arrayContaining(["src/main.ts", "src/app.module.ts", "tsconfig.json"])
    );
    expect(plan.scripts.dev).toBe("nest start --watch");
  });

  it("resolves a fullstack React + Express + Vitest plan with both test companions", () => {
    const plan = resolvePlan(getRecipes(["react", "express", "vitest"]), {
      frontend: "react",
      backend: "express",
      language: "typescript",
      buildTool: "vite",
      reactCompiler: false,
    });
    expect(plan.devDependencies).toHaveProperty("jsdom");
    expect(plan.devDependencies).toHaveProperty("@testing-library/react");
    expect(plan.devDependencies).toHaveProperty("supertest");
    expect(plan.devDependencies).toHaveProperty("@types/supertest");
  });

  it("selects Drizzle companion packages per database driver", () => {
    const recipes = getRecipes(["drizzle"]);

    const pg = resolvePlan(recipes, {
      backend: "express",
      language: "typescript",
      databaseDriver: "postgresql",
    });
    expect(pg.dependencies).toHaveProperty("drizzle-orm");
    expect(pg.dependencies).toHaveProperty("pg");
    expect(pg.devDependencies).toHaveProperty("@types/pg");
    expect(pg.dependencies).not.toHaveProperty("mysql2");
  });

  it("generates a Prisma schema matching the chosen database", () => {
    const recipes = getRecipes(["prisma"]);
    const plan = resolvePlan(recipes, { databaseDriver: "sqlite" });
    expect(plan.dependencies).toHaveProperty("@prisma/client");
    expect(plan.devDependencies).toHaveProperty("prisma");
    const schema = plan.files.find((f) => f.path === "prisma/schema.prisma");
    expect(schema?.content).toContain('provider = "sqlite"');
    expect(plan.files.map((f) => f.path)).toContain(".env.example");
  });

  it("lets pinned versions win over latest", () => {
    const recipe: Recipe = {
      id: "t",
      name: "t",
      category: "shared",
      dependencies: [
        { packages: ["react"] },
        { packages: [{ name: "react", version: "18.3.1" }] },
      ],
    };
    const plan = resolvePlan([recipe], {});
    expect(plan.dependencies.react).toBe("18.3.1");
  });

  it("rejects unsafe file paths from recipes", () => {
    const evil: Recipe = {
      id: "evil",
      name: "evil",
      category: "shared",
      files: [{ path: "../outside.txt", content: "x" }],
    };
    expect(() => resolvePlan([evil], {})).toThrow();
  });
});

describe("featuresForFrameworks", () => {
  it("narrows options to the selected frameworks", () => {
    const vueFeatures = featuresForFrameworks(["vue"]);
    const state = vueFeatures.find((f) => f.id === "stateManagement");
    expect(state?.options.map((o) => o.value)).toEqual(["pinia", "none"]);
    expect(vueFeatures.find((f) => f.id === "router")).toBeUndefined();
    expect(vueFeatures.find((f) => f.id === "forms")).toBeUndefined();
  });

  it("merges features across a fullstack selection without duplicates", () => {
    const features = featuresForFrameworks(["react", "express"]);
    const ids = features.map((f) => f.id);
    expect(ids).toEqual([...new Set(ids)]);
    expect(ids).toContain("router");
    expect(ids).toContain("validation");
    expect(ids).toContain("testing");
  });

  it("returns nothing when no framework was selected", () => {
    expect(featuresForFrameworks([])).toEqual([]);
  });
});
