import path from "node:path";
import { describe, expect, it } from "vitest";
import { isInsideRoot, resolveInsideRoot } from "../src/project/safe-paths.js";

const root = path.resolve("/tmp/project");

describe("safe paths", () => {
  it("accepts paths inside the root", () => {
    expect(isInsideRoot(root, "src/lib/query-client.ts")).toBe(true);
    expect(resolveInsideRoot(root, "src/main.tsx")).toBe(path.join(root, "src", "main.tsx"));
  });

  it("rejects traversal", () => {
    expect(isInsideRoot(root, "../../file")).toBe(false);
    expect(() => resolveInsideRoot(root, "../../file")).toThrow(/escapes/);
    expect(() => resolveInsideRoot(root, "..\\..\\file")).toThrow();
  });

  it("rejects absolute paths", () => {
    expect(() => resolveInsideRoot(root, path.resolve("/etc/passwd"))).toThrow(/absolute/i);
  });
});
