import path from "node:path";
import { StackPackError } from "../utils/errors.js";
import type {
  Answers,
  Condition,
  PackageRef,
  Recipe,
} from "../recipes/types.js";

export interface InstallPlan {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  files: Array<{ path: string; content: string }>;
  scripts: Record<string, string>;
  notes: string[];
}

export function matchesCondition(
  when: Condition | undefined,
  answers: Answers
): boolean {
  if (!when) return true;
  return Object.entries(when).every(([key, expected]) => {
    const actual = answers[key];
    return Array.isArray(expected)
      ? expected.includes(actual as never)
      : actual === expected;
  });
}

function refToEntry(ref: PackageRef): [string, string] {
  return typeof ref === "string" ? [ref, "latest"] : [ref.name, ref.version];
}

function addPackage(
  record: Record<string, string>,
  name: string,
  version: string
): void {
  const existing = record[name];
  // a pinned version always wins over "latest"
  if (existing === undefined || (existing === "latest" && version !== "latest")) {
    record[name] = version;
  }
}

function assertSafePath(filePath: string): void {
  if (path.isAbsolute(filePath) || filePath.split(/[\\/]/).includes("..")) {
    throw new StackPackError(`Recipe produced an unsafe file path: ${filePath}`);
  }
}

export function resolvePlan(recipes: Recipe[], answers: Answers): InstallPlan {
  const plan: InstallPlan = {
    dependencies: {},
    devDependencies: {},
    files: [],
    scripts: {},
    notes: [],
  };

  for (const recipe of recipes) {
    for (const rule of recipe.dependencies ?? []) {
      if (!matchesCondition(rule.when, answers)) continue;
      for (const ref of rule.packages) {
        const [name, version] = refToEntry(ref);
        addPackage(plan.dependencies, name, version);
      }
    }
    for (const rule of recipe.devDependencies ?? []) {
      if (!matchesCondition(rule.when, answers)) continue;
      for (const ref of rule.packages) {
        const [name, version] = refToEntry(ref);
        addPackage(plan.devDependencies, name, version);
      }
    }
    for (const rule of recipe.files ?? []) {
      if (!matchesCondition(rule.when, answers)) continue;
      assertSafePath(rule.path);
      if (!plan.files.some((f) => f.path === rule.path)) {
        plan.files.push({ path: rule.path, content: rule.content });
      }
    }
    for (const rule of recipe.scripts ?? []) {
      if (!matchesCondition(rule.when, answers)) continue;
      for (const [key, value] of Object.entries(rule.scripts)) {
        plan.scripts[key] ??= value;
      }
    }
    for (const rule of recipe.notes ?? []) {
      if (matchesCondition(rule.when, answers)) plan.notes.push(rule.message);
    }
  }

  // a package never needs to be in both lists
  for (const name of Object.keys(plan.devDependencies)) {
    if (name in plan.dependencies) delete plan.devDependencies[name];
  }
  return plan;
}
