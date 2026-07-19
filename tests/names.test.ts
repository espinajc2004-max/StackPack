import { describe, expect, it } from "vitest";
import { validatePresetName, validateProjectName } from "../src/utils/names.js";

describe("validateProjectName", () => {
  it("accepts safe names", () => {
    expect(validateProjectName("my-application").ok).toBe(true);
    expect(validateProjectName("app_2").ok).toBe(true);
  });

  it("rejects empty, traversal, and separator input", () => {
    expect(validateProjectName("").ok).toBe(false);
    expect(validateProjectName("..").ok).toBe(false);
    expect(validateProjectName("../evil").ok).toBe(false);
    expect(validateProjectName("a/b").ok).toBe(false);
    expect(validateProjectName("a\\b").ok).toBe(false);
    expect(validateProjectName(".hidden").ok).toBe(false);
  });

  it("rejects Windows reserved names", () => {
    expect(validateProjectName("con").ok).toBe(false);
    expect(validateProjectName("NUL").ok).toBe(false);
    expect(validateProjectName("com1").ok).toBe(false);
  });
});

describe("validatePresetName", () => {
  it("accepts safe names and rejects unsafe ones", () => {
    expect(validatePresetName("jc-react-stack").ok).toBe(true);
    expect(validatePresetName("../escape").ok).toBe(false);
    expect(validatePresetName("a..b").ok).toBe(false);
    expect(validatePresetName("").ok).toBe(false);
  });
});
