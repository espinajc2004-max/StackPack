import { describe, expect, it } from "vitest";
import {
  createEmptySelection,
  editablePackageNames,
  selectedIntegrationCount,
  selectedRecipes,
} from "../src/dashboard/state.js";

describe("dashboard selection state", () => {
  it("persists selections across category edits", () => {
    const selection = createEmptySelection();
    selection.routing = { id: "react-router", options: {} };
    selection.stateManagement = { id: "zustand", options: {} };
    selection.testing.push({ id: "vitest-react", options: { testTarget: "components" } });

    // Simulate visiting another category and coming back.
    selection.dataFetching = { id: "tanstack-query", options: { devtools: true } };
    expect(selectedIntegrationCount(selection)).toBe(4);
    expect(selection.routing?.id).toBe("react-router");

    // Selecting None in a category removes only that category's selection.
    selection.stateManagement = undefined;
    expect(selectedIntegrationCount(selection)).toBe(3);
  });

  it("maps selections to recipes in a stable order", () => {
    const selection = createEmptySelection();
    selection.testing.push({ id: "playwright", options: {} });
    selection.routing = { id: "react-router", options: {} };
    const recipes = selectedRecipes(selection).map(({ recipe }) => recipe.id);
    expect(recipes).toEqual(["react-router", "playwright"]);
  });

  it("lists editable package names for selected recipes and custom packages", () => {
    const selection = createEmptySelection();
    selection.dataFetching = { id: "tanstack-query", options: { devtools: true } };
    selection.customPackages.push({
      name: "sonner",
      version: "latest",
      dependencyType: "dependency",
    });
    const names = editablePackageNames(selection);
    expect(names).toContain("@tanstack/react-query");
    expect(names).toContain("@tanstack/react-query-devtools");
    expect(names).toContain("sonner");
  });
});
