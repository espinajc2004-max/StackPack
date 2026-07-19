import { StackPackError } from "../utils/errors.js";

export type OrderableRecipe = {
  id: string;
  requires: string[];
  runsAfter: string[];
  conflictsWith: string[];
};

/**
 * Produces a valid execution order for the selected recipes.
 * - `requires` must be present in the selection and orders before.
 * - `runsAfter` orders before only when the other recipe is selected.
 * - `conflictsWith` aborts when both are selected.
 * Detects circular dependencies before anything runs.
 */
export function resolveExecutionOrder<T extends OrderableRecipe>(selected: T[]): T[] {
  const ids = new Set(selected.map((r) => r.id));

  for (const recipe of selected) {
    for (const required of recipe.requires) {
      if (!ids.has(required)) {
        throw new StackPackError(
          `Integration "${recipe.id}" requires "${required}", which is not selected.`,
        );
      }
    }
    for (const conflict of recipe.conflictsWith) {
      if (ids.has(conflict)) {
        throw new StackPackError(
          `Integrations "${recipe.id}" and "${conflict}" cannot be installed together.`,
        );
      }
    }
  }

  // Kahn's algorithm; edges from prerequisite -> dependent.
  const indegree = new Map<string, number>(selected.map((r) => [r.id, 0]));
  const edges = new Map<string, string[]>();
  for (const recipe of selected) {
    const before = [...recipe.requires, ...recipe.runsAfter.filter((id) => ids.has(id))];
    for (const prerequisite of before) {
      edges.set(prerequisite, [...(edges.get(prerequisite) ?? []), recipe.id]);
      indegree.set(recipe.id, (indegree.get(recipe.id) ?? 0) + 1);
    }
  }

  const queue = selected.filter((r) => (indegree.get(r.id) ?? 0) === 0).map((r) => r.id);
  const orderedIds: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift() as string;
    orderedIds.push(id);
    for (const dependent of edges.get(id) ?? []) {
      const remaining = (indegree.get(dependent) ?? 0) - 1;
      indegree.set(dependent, remaining);
      if (remaining === 0) queue.push(dependent);
    }
  }

  if (orderedIds.length !== selected.length) {
    const cyclic = selected
      .map((r) => r.id)
      .filter((id) => !orderedIds.includes(id))
      .join(", ");
    throw new StackPackError(`Invalid recipe graph: circular dependency involving ${cyclic}.`);
  }

  const byId = new Map(selected.map((r) => [r.id, r]));
  return orderedIds.map((id) => byId.get(id) as T);
}
