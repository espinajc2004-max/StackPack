import { describe, expect, it } from "vitest";
import {
  formatPackage,
  isValidPackageName,
  isValidVersionInput,
  parsePackageInput,
} from "../src/utils/package-parser.js";

describe("parsePackageInput", () => {
  it("defaults to latest when no version is given", () => {
    expect(parsePackageInput("react")).toEqual({ name: "react", version: "latest" });
  });

  it("parses name@version", () => {
    expect(parsePackageInput("react@18.3.1")).toEqual({
      name: "react",
      version: "18.3.1",
    });
  });

  it("never treats a scoped package's first @ as the version separator", () => {
    expect(parsePackageInput("@reduxjs/toolkit")).toEqual({
      name: "@reduxjs/toolkit",
      version: "latest",
    });
    expect(parsePackageInput("@tanstack/react-query@5")).toEqual({
      name: "@tanstack/react-query",
      version: "5",
    });
  });

  it("handles ranges and dist-tags", () => {
    expect(parsePackageInput("react@^18")).toEqual({ name: "react", version: "^18" });
    expect(parsePackageInput("axios@latest")).toEqual({
      name: "axios",
      version: "latest",
    });
  });

  it("trims whitespace", () => {
    expect(parsePackageInput("  zod@3  ")).toEqual({ name: "zod", version: "3" });
  });
});

describe("isValidPackageName", () => {
  it.each(["react", "@scope/pkg", "my-lib.js", "a"])("accepts %s", (name) => {
    expect(isValidPackageName(name)).toBe(true);
  });

  it.each(["", "Not Valid", "UPPER", "@bad", "a b", "../evil"])(
    "rejects %s",
    (name) => {
      expect(isValidPackageName(name)).toBe(false);
    }
  );
});

describe("isValidVersionInput", () => {
  it.each(["18", "18.3", "18.3.1", "^18.3.1", "~18.3.1", "latest", "next", "beta", "5"])(
    "accepts %s",
    (v) => {
      expect(isValidVersionInput(v)).toBe(true);
    }
  );

  it.each(["", "not a version!", ">=18 <20"])("rejects %s", (v) => {
    expect(isValidVersionInput(v)).toBe(false);
  });
});

describe("formatPackage", () => {
  it("joins name and version", () => {
    expect(formatPackage("@tanstack/react-query", "5")).toBe(
      "@tanstack/react-query@5"
    );
  });
});
