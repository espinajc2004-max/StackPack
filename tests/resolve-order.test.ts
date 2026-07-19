import { describe, expect, it } from "vitest";
import { resolveExecutionOrder } from "../src/engine/resolve-order.js";

function recipe(
  id: string,
  extra: Partial<{ requires: string[]; runsAfter: string[]; conflictsWith: string[] }> = {},
) {
  return { id, requires: [], runsAfter: [], conflictsWith: [], ...extra };
}

describe("resolveExecutionOrder", () => {
  it("keeps original order without constraints", () => {
    const order = resolveExecutionOrder([recipe("a"), recipe("b"), recipe("c")]);
    expect(order.map((r) => r.id)).toEqual(["a", "b", "c"]);
  });

  it("orders runsAfter dependencies when both are selected", () => {
    const order = resolveExecutionOrder([
      recipe("playwright", { runsAfter: ["vitest-react"] }),
      recipe("vitest-react"),
    ]);
    expect(order.map((r) => r.id)).toEqual(["vitest-react", "playwright"]);
  });

  it("ignores runsAfter when the other recipe is not selected", () => {
    const order = resolveExecutionOrder([recipe("playwright", { runsAfter: ["vitest-react"] })]);
    expect(order.map((r) => r.id)).toEqual(["playwright"]);
  });

  it("fails when a required recipe is missing", () => {
    expect(() => resolveExecutionOrder([recipe("a", { requires: ["b"] })])).toThrow(/requires "b"/);
  });

  it("fails on conflicting recipes", () => {
    expect(() =>
      resolveExecutionOrder([recipe("a", { conflictsWith: ["b"] }), recipe("b")]),
    ).toThrow(/cannot be installed together/);
  });

  it("detects circular dependencies before running anything", () => {
    expect(() =>
      resolveExecutionOrder([recipe("a", { requires: ["b"] }), recipe("b", { requires: ["a"] })]),
    ).toThrow(/circular/i);
  });
});
