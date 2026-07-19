import { describe, expect, it } from "vitest";
import { parsePackageSpecifier } from "../src/utils/package-specifier.js";

describe("parsePackageSpecifier", () => {
  it("parses a bare package name with latest default", () => {
    const result = parsePackageSpecifier("axios");
    expect(result).toEqual({ ok: true, value: { name: "axios", version: "latest" } });
  });

  it("parses name@version", () => {
    expect(parsePackageSpecifier("axios@1")).toEqual({
      ok: true,
      value: { name: "axios", version: "1" },
    });
    expect(parsePackageSpecifier("react@18")).toEqual({
      ok: true,
      value: { name: "react", version: "18" },
    });
  });

  it("parses scoped packages", () => {
    expect(parsePackageSpecifier("@reduxjs/toolkit")).toEqual({
      ok: true,
      value: { name: "@reduxjs/toolkit", version: "latest" },
    });
    expect(parsePackageSpecifier("@tanstack/react-query@5")).toEqual({
      ok: true,
      value: { name: "@tanstack/react-query", version: "5" },
    });
  });

  it("parses ranges and tags as versions", () => {
    expect(parsePackageSpecifier("sonner@latest")).toEqual({
      ok: true,
      value: { name: "sonner", version: "latest" },
    });
    expect(parsePackageSpecifier("zod@^3.23.0")).toEqual({
      ok: true,
      value: { name: "zod", version: "^3.23.0" },
    });
    expect(parsePackageSpecifier("next@canary")).toEqual({
      ok: true,
      value: { name: "next", version: "canary" },
    });
  });

  it("rejects spaces", () => {
    expect(parsePackageSpecifier("package with spaces").ok).toBe(false);
  });

  it("rejects path-like input", () => {
    expect(parsePackageSpecifier("../package").ok).toBe(false);
    expect(parsePackageSpecifier("../../danger").ok).toBe(false);
    expect(parsePackageSpecifier("..\\..\\danger").ok).toBe(false);
    expect(parsePackageSpecifier("/etc/passwd").ok).toBe(false);
    expect(parsePackageSpecifier(".hidden").ok).toBe(false);
  });

  it("rejects empty input and empty versions", () => {
    expect(parsePackageSpecifier("").ok).toBe(false);
    expect(parsePackageSpecifier("axios@").ok).toBe(false);
  });

  it("rejects invalid package names", () => {
    expect(parsePackageSpecifier("UPPERCASE").ok).toBe(false);
    expect(parsePackageSpecifier("@scope").ok).toBe(false);
  });

  it("rejects invalid versions", () => {
    expect(parsePackageSpecifier("axios@not a version").ok).toBe(false);
  });
});
