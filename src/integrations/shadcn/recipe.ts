import type { InitializerSpec, IntegrationRecipe } from "../types.js";
import type { CommandDefinition, PackageManager } from "../../package-manager/types.js";

/**
 * shadcn/ui is driven by its official CLI, not a package dependency. Adding
 * the Button component on a fresh project makes the CLI run its own init
 * questions first, then generates src/components/ui/button — so the user
 * gets a real component to test immediately.
 */
const initializer: InitializerSpec = {
  description:
    "The official shadcn CLI runs interactively: it initializes components.json (asking its own questions) and adds the Button component so you can test it right away. Requires Tailwind CSS.",
  interactive: true,
  buildCommand(packageManager: PackageManager, cwd: string): CommandDefinition {
    switch (packageManager) {
      case "npm":
        return { command: "npx", args: ["shadcn@latest", "add", "button"], cwd, interactive: true };
      case "pnpm":
        return {
          command: "pnpm",
          args: ["dlx", "shadcn@latest", "add", "button"],
          cwd,
          interactive: true,
        };
      case "yarn":
        return {
          command: "yarn",
          args: ["dlx", "shadcn@latest", "add", "button"],
          cwd,
          interactive: true,
        };
      case "bun":
        return {
          command: "bunx",
          args: ["--bun", "shadcn@latest", "add", "button"],
          cwd,
          interactive: true,
        };
    }
  },
};

export const shadcnRecipe: IntegrationRecipe = {
  id: "shadcn",
  recipeVersion: 1,
  name: "shadcn/ui",
  category: "ui",
  status: "stable",
  installationSummary: "Official shadcn CLI (adds the Button component)",
  officialSource: {
    documentationUrl: "https://ui.shadcn.com/docs/installation",
    lastVerifiedAt: "2026-07-19",
  },
  requires: [],
  runsAfter: [],
  conflictsWith: [],
  supportedProjects: [{ frameworks: ["react", "next"] }],
  installation: { type: "official-initializer", initializer },
  detectInstalled(context) {
    if (context.detectedFiles.includes("components.json")) {
      return { status: "installed", details: "components.json exists." };
    }
    return { status: "not-installed" };
  },
  createPlan() {
    return {
      packages: [],
      filesToCreate: [],
      scripts: [],
      postInstallNotes: [
        "Render <Button> from @/components/ui/button in any page to test shadcn/ui.",
        "Add more components anytime with: npx shadcn@latest add <component>.",
        "shadcn/ui needs Tailwind CSS; pick it during base project setup.",
      ],
      initializer,
    };
  },
};
