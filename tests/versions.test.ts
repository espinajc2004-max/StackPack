import { describe, expect, it } from "vitest";
import { parseVersionSpec, versionSpecsCompatible } from "../src/utils/versions.js";

describe("parseVersionSpec", () => {
  it("accepts exact versions and ranges", () => {
    expect(parseVersionSpec("18")).toEqual({ kind: "range", raw: "18" });
    expect(parseVersionSpec("18.3.1")).toEqual({ kind: "range", raw: "18.3.1" });
    expect(parseVersionSpec("^18.3.1")).toEqual({ kind: "range", raw: "^18.3.1" });
    expect(parseVersionSpec("~18.3.1")).toEqual({ kind: "range", raw: "~18.3.1" });
  });

  it("treats npm distribution tags separately from ranges", () => {
    expect(parseVersionSpec("latest")).toEqual({ kind: "tag", raw: "latest" });
    expect(parseVersionSpec("next")).toEqual({ kind: "tag", raw: "next" });
    expect(parseVersionSpec("beta")).toEqual({ kind: "tag", raw: "beta" });
    expect(parseVersionSpec("canary")).toEqual({ kind: "tag", raw: "canary" });
  });

  it("rejects invalid input", () => {
    expect(parseVersionSpec("")).toBeNull();
    expect(parseVersionSpec("not a version")).toBeNull();
    expect(parseVersionSpec("1.2.3 || nonsense$$")).toBeNull();
  });
});

describe("versionSpecsCompatible", () => {
  it("intersecting ranges are compatible", () => {
    expect(versionSpecsCompatible("^5.1.0", "5")).toBe(true);
    expect(versionSpecsCompatible("^5.1.0", "^6.0.0")).toBe(false);
  });

  it("tags only match themselves", () => {
    expect(versionSpecsCompatible("latest", "latest")).toBe(true);
    expect(versionSpecsCompatible("latest", "beta")).toBe(false);
    expect(versionSpecsCompatible("latest", "5")).toBe(false);
  });
});
