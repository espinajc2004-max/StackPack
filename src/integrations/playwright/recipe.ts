import type { InitializerSpec, IntegrationRecipe } from "../types.js";
import { detectByPackages } from "../detect.js";
import type { CommandDefinition, PackageManager } from "../../package-manager/types.js";

const initializer: InitializerSpec = {
  description:
    "The official Playwright initializer will run interactively. It may ask questions, install browsers, and create configuration, example tests, and CI files.",
  interactive: true,
  buildCommand(packageManager: PackageManager, cwd: string): CommandDefinition {
    switch (packageManager) {
      case "npm":
        return { command: "npm", args: ["init", "playwright@latest"], cwd, interactive: true };
      case "pnpm":
        return { command: "pnpm", args: ["create", "playwright"], cwd, interactive: true };
      case "yarn":
        return { command: "yarn", args: ["create", "playwright"], cwd, interactive: true };
      case "bun":
        return { command: "bun", args: ["create", "playwright"], cwd, interactive: true };
    }
  },
};

export const playwrightRecipe: IntegrationRecipe = {
  id: "playwright",
  recipeVersion: 1,
  name: "Playwright",
  category: "testing",
  status: "stable",
  installationSummary: "Official initializer CLI",
  officialSource: {
    documentationUrl: "https://playwright.dev/docs/intro",
    lastVerifiedAt: "2026-07-19",
  },
  requires: [],
  runsAfter: ["vitest-react"],
  conflictsWith: [],
  supportedProjects: [{ frameworks: ["react", "next"] }],
  installation: { type: "official-initializer", initializer },
  detectInstalled(context) {
    const byPackage = detectByPackages(context, ["@playwright/test"]);
    if (byPackage.status === "installed") return byPackage;
    if (context.detectedFiles.some((file) => file.startsWith("playwright.config."))) {
      return {
        status: "partially-configured",
        details: "Config exists but @playwright/test is not installed.",
      };
    }
    return { status: "not-installed" };
  },
  createPlan() {
    return {
      packages: [],
      filesToCreate: [],
      scripts: [],
      postInstallNotes: [
        "Playwright setup is delegated to the official initializer.",
        "StackPack will rescan the project after the initializer finishes.",
      ],
      initializer,
    };
  },
};
