import { describe, expect, it } from "vitest";
import {
  presetSchema,
  PRESET_SCHEMA_VERSION,
} from "../src/schemas/preset-schema.js";

const validPreset = {
  schemaVersion: PRESET_SCHEMA_VERSION,
  name: "my-react-stack",
  displayName: "My React Stack",
  scope: "global",
  createdAt: "2026-07-19T15:30:00.000Z",
  updatedAt: "2026-07-19T15:30:00.000Z",
  environment: {
    type: "frontend",
    framework: "react",
    language: "typescript",
    buildTool: "vite",
  },
  selections: { router: "react-router-dom", reactCompiler: false },
  dependencies: { react: "latest", "@tanstack/react-query": "5" },
  devDependencies: { vite: "latest", typescript: "latest" },
  recipes: ["react", "react-router"],
  files: [{ path: "vite.config.ts", content: "export default {}" }],
  scripts: { dev: "vite" },
};

describe("presetSchema", () => {
  it("accepts a valid preset", () => {
    expect(presetSchema.parse(validPreset).name).toBe("my-react-stack");
  });

  it("defaults optional collections", () => {
    const minimal = presetSchema.parse({
      schemaVersion: PRESET_SCHEMA_VERSION,
      name: "min",
      displayName: "Min",
      createdAt: "x",
      updatedAt: "x",
      environment: { type: "general" },
    });
    expect(minimal.dependencies).toEqual({});
    expect(minimal.scope).toBe("global");
    expect(minimal.recipes).toEqual([]);
  });

  it("rejects unsupported schema versions", () => {
    expect(
      presetSchema.safeParse({ ...validPreset, schemaVersion: 999 }).success
    ).toBe(false);
  });

  it("rejects unsafe preset names", () => {
    for (const name of ["../../danger", "..\\..\\danger", "has space", "UPPER"]) {
      expect(presetSchema.safeParse({ ...validPreset, name }).success).toBe(false);
    }
  });

  it("rejects malformed package names in records", () => {
    const bad = { ...validPreset, dependencies: { "Not Valid!": "latest" } };
    expect(presetSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects absolute and traversal file paths", () => {
    for (const filePath of ["/etc/passwd", "C:\\evil.txt", "../outside", "a/../../b"]) {
      const bad = { ...validPreset, files: [{ path: filePath, content: "" }] };
      expect(presetSchema.safeParse(bad).success, filePath).toBe(false);
    }
  });
});
