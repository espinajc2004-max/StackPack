import { describe, expect, it } from "vitest";
import { detectStack } from "../src/project/detect-stack.js";

describe("detectStack", () => {
  it("detects a React TypeScript Vite project", () => {
    const detections = detectStack({
      dependencies: {
        react: "^18",
        "react-dom": "^18",
        "react-router-dom": "^6",
        zustand: "^5",
        zod: "^3",
      },
      devDependencies: { typescript: "^5", vite: "^5", vitest: "^2" },
    });
    const byCategory = Object.fromEntries(
      detections.map((d) => [d.category, d.found])
    );
    expect(byCategory.framework).toBe("react");
    expect(byCategory.language).toBe("typescript");
    expect(byCategory.buildTool).toBe("vite");
    expect(byCategory.router).toBe("react-router-dom");
    expect(byCategory.stateManagement).toBe("zustand");
    expect(byCategory.validation).toBe("zod");
    expect(byCategory.testing).toBe("vitest");
    expect(byCategory.dataFetching).toBeNull();
  });

  it("detects an Express backend", () => {
    const detections = detectStack({
      dependencies: { express: "^4", "drizzle-orm": "^0.30" },
      devDependencies: {},
    });
    const byCategory = Object.fromEntries(
      detections.map((d) => [d.category, d.found])
    );
    expect(byCategory.framework).toBe("express");
    expect(byCategory.orm).toBe("drizzle-orm");
    expect(byCategory.language).toBeNull();
  });

  it("maps detections to recipe ids where available", () => {
    const detections = detectStack({
      dependencies: { react: "^18", zustand: "^5" },
    });
    const framework = detections.find((d) => d.category === "framework");
    expect(framework?.recipeId).toBe("react");
  });
});
