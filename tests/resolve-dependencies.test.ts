import { describe, expect, it } from "vitest";
import { resolveDependencies } from "../src/engine/resolve-dependencies.js";

describe("resolveDependencies", () => {
  it("deduplicates packages requested by multiple recipes", () => {
    const result = resolveDependencies({
      requirements: [
        {
          name: "zod",
          version: "latest",
          dependencyType: "dependency",
          requestedBy: "React Hook Form with Zod",
        },
        {
          name: "zod",
          version: "latest",
          dependencyType: "dependency",
          requestedBy: "custom package",
        },
      ],
      versionOverrides: {},
      installedPackages: {},
    });
    expect(result.conflicts).toHaveLength(0);
    expect(result.packages).toHaveLength(1);
    expect(result.packages[0]?.requestedBy).toEqual(["React Hook Form with Zod", "custom package"]);
  });

  it("resolves latest + specific to the specific version with a warning", () => {
    const result = resolveDependencies({
      requirements: [
        { name: "zod", version: "latest", dependencyType: "dependency", requestedBy: "recipe" },
        { name: "zod", version: "3", dependencyType: "dependency", requestedBy: "custom package" },
      ],
      versionOverrides: {},
      installedPackages: {},
    });
    expect(result.conflicts).toHaveLength(0);
    expect(result.packages[0]?.resolvedVersion).toBe("3");
    expect(result.warnings.some((w) => w.includes("zod"))).toBe(true);
  });

  it("does not silently choose between different specific versions", () => {
    const result = resolveDependencies({
      requirements: [
        { name: "zod", version: "^3.0.0", dependencyType: "dependency", requestedBy: "a" },
        { name: "zod", version: "^4.0.0", dependencyType: "dependency", requestedBy: "b" },
      ],
      versionOverrides: {},
      installedPackages: {},
    });
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0]?.name).toBe("zod");
    expect(result.packages).toHaveLength(0);
  });

  it("user version overrides win", () => {
    const result = resolveDependencies({
      requirements: [
        {
          name: "@tanstack/react-query",
          version: "latest",
          dependencyType: "dependency",
          requestedBy: "TanStack Query",
        },
      ],
      versionOverrides: { "@tanstack/react-query": "5" },
      installedPackages: {},
    });
    expect(result.packages[0]?.resolvedVersion).toBe("5");
    expect(result.packages[0]?.requestedBy).toContain("version override");
  });

  it("an override resolves an otherwise conflicting pair", () => {
    const result = resolveDependencies({
      requirements: [
        { name: "zod", version: "^3.0.0", dependencyType: "dependency", requestedBy: "a" },
        { name: "zod", version: "^4.0.0", dependencyType: "dependency", requestedBy: "b" },
      ],
      versionOverrides: { zod: "^4.0.0" },
      installedPackages: {},
    });
    expect(result.conflicts).toHaveLength(0);
    expect(result.packages[0]?.resolvedVersion).toBe("^4.0.0");
  });

  it("dependency wins over devDependency with a warning", () => {
    const result = resolveDependencies({
      requirements: [
        { name: "zod", version: "latest", dependencyType: "devDependency", requestedBy: "a" },
        { name: "zod", version: "latest", dependencyType: "dependency", requestedBy: "b" },
      ],
      versionOverrides: {},
      installedPackages: {},
    });
    expect(result.packages[0]?.dependencyType).toBe("dependency");
    expect(result.warnings.some((w) => w.includes("devDependency"))).toBe(true);
  });

  it("warns when a package is already installed", () => {
    const result = resolveDependencies({
      requirements: [
        {
          name: "zustand",
          version: "latest",
          dependencyType: "dependency",
          requestedBy: "Zustand",
        },
      ],
      versionOverrides: {},
      installedPackages: { zustand: "^4.0.0" },
    });
    expect(result.warnings.some((w) => w.includes("already installed"))).toBe(true);
  });
});
