import { describe, expect, it } from "vitest";
import {
  slugifyPresetName,
  validatePresetName,
  validateProjectFolderName,
} from "../src/utils/sanitize-name.js";
import { suggestClosest } from "../src/utils/suggest.js";

describe("slugifyPresetName", () => {
  it("converts display names to safe slugs", () => {
    expect(slugifyPresetName("My React Stack")).toBe("my-react-stack");
    expect(slugifyPresetName("  Express  API!  ")).toBe("express-api");
    expect(slugifyPresetName("weird///name")).toBe("weird-name");
  });
});

describe("validatePresetName", () => {
  it("accepts safe names", () => {
    expect(validatePresetName("my-react-stack")).toBeUndefined();
    expect(validatePresetName("stack2.0_beta")).toBeUndefined();
  });

  it("rejects traversal and path characters", () => {
    expect(validatePresetName("../../danger")).toBeDefined();
    expect(validatePresetName("..\\..\\danger")).toBeDefined();
    expect(validatePresetName("a/b")).toBeDefined();
    expect(validatePresetName("")).toBeDefined();
  });
});

describe("validateProjectFolderName", () => {
  it.each(["my-app", "my_app", "app2", "my.app", "MyApp"])(
    "accepts %s",
    (name) => {
      expect(validateProjectFolderName(name)).toBeUndefined();
    }
  );

  it.each(["", "  ", "my app", "a/b", "a\\b", "..", "../evil", "con?", "app."])(
    "rejects %s",
    (name) => {
      expect(validateProjectFolderName(name)).toBeDefined();
    }
  );
});

describe("suggestClosest", () => {
  it("suggests a close match for typos", () => {
    expect(
      suggestClosest("react-roter-dom", ["react-router-dom", "zustand", "axios"])
    ).toBe("react-router-dom");
  });

  it("returns undefined when nothing is close", () => {
    expect(suggestClosest("completely-unrelated", ["react", "vue"])).toBeUndefined();
  });
});
