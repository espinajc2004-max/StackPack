import { describe, expect, it } from "vitest";
import { matchesCondition, resolvePlan } from "../src/engine/resolve.js";
import { getRecipes } from "../src/recipes/registry.js";
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
      framework: "react",
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
      framework: "react",
      language: "typescript",
      buildTool: "vite",
    };

    const without = resolvePlan(recipes, { ...base, reactCompiler: false });
    expect(without.devDependencies).not.toHaveProperty("babel-plugin-react-compiler");
    expect(
      without.files.find((f) => f.path === "vite.config.ts")?.content
    ).not.toContain("react-compiler");

    const withCompiler = resolvePlan(recipes, { ...base, reactCompiler: true });
    expect(withCompiler.devDependencies).toHaveProperty("babel-plugin-react-compiler");
    expect(
      withCompiler.files.find((f) => f.path === "vite.config.ts")?.content
    ).toContain("babel-plugin-react-compiler");
  });

  it("resolves Express JavaScript vs TypeScript variants from one recipe", () => {
    const recipes = getRecipes(["express"]);

    const js = resolvePlan(recipes, { framework: "express", language: "javascript" });
    expect(js.devDependencies).toHaveProperty("nodemon");
    expect(js.devDependencies).not.toHaveProperty("typescript");
    expect(js.files.map((f) => f.path)).toContain("src/server.js");
    expect(js.scripts.dev).toBe("nodemon src/server.js");

    const ts = resolvePlan(recipes, { framework: "express", language: "typescript" });
    expect(ts.devDependencies).toHaveProperty("typescript");
    expect(ts.devDependencies).toHaveProperty("@types/express");
    expect(ts.files.map((f) => f.path)).toEqual(
      expect.arrayContaining(["src/server.ts", "tsconfig.json", ".env.example"])
    );
    expect(ts.scripts.dev).toBe("tsx watch src/server.ts");
  });

  it("selects Drizzle companion packages per database driver", () => {
    const recipes = getRecipes(["drizzle"]);

    const pg = resolvePlan(recipes, {
      framework: "express",
      language: "typescript",
      databaseDriver: "postgresql",
    });
    expect(pg.dependencies).toHaveProperty("drizzle-orm");
    expect(pg.dependencies).toHaveProperty("pg");
    expect(pg.devDependencies).toHaveProperty("@types/pg");
    expect(pg.dependencies).not.toHaveProperty("mysql2");

    const sqlite = resolvePlan(recipes, {
      framework: "express",
      language: "javascript",
      databaseDriver: "sqlite",
    });
    expect(sqlite.dependencies).toHaveProperty("better-sqlite3");
    expect(sqlite.devDependencies).not.toHaveProperty("@types/better-sqlite3");
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
