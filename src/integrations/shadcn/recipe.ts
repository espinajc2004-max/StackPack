import fs from "node:fs";
import path from "node:path";
import type {
  InitializerSpec,
  IntegrationRecipe,
  PackageRequirement,
  PlannedFile,
  PlannedJsonEdit,
} from "../types.js";
import type { ProjectContext } from "../../schemas/project-context.js";
import type { CommandDefinition, PackageManager } from "../../package-manager/types.js";

/**
 * shadcn/ui is driven by its official CLI, not a package dependency. Adding
 * the Button component on a fresh project makes the CLI run its own init
 * questions first, then generates src/components/ui/button — so the user
 * gets a real component to test immediately.
 *
 * The CLI validates two prerequisites and aborts without them: Tailwind CSS
 * and a "@/*" import alias. Next.js projects created with Tailwind already
 * satisfy both. Vite projects satisfy neither, so this recipe prepares them
 * first, following the official shadcn Vite guide
 * (https://ui.shadcn.com/docs/installation/vite): install tailwindcss +
 * @tailwindcss/vite, import Tailwind in index.css, add the plugin and alias
 * to vite.config, and register the alias in tsconfig/jsconfig.
 */
const initializer: InitializerSpec = {
  description:
    "The official shadcn CLI runs interactively: it initializes components.json (asking its own questions) and adds the Button component so you can test it right away.",
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

const aliasPaths = { "@/*": ["./src/*"] };

/**
 * Rebuilds vite.config with the Tailwind plugin and @/* alias while keeping
 * the plugin variant the official template used (plain React, React
 * Compiler via @rolldown/plugin-babel, or SWC).
 */
function viteConfigContents(existingConfig: string): string {
  const usesSwc = existingConfig.includes("@vitejs/plugin-react-swc");
  const usesReactCompiler =
    existingConfig.includes("reactCompilerPreset") ||
    existingConfig.includes("@rolldown/plugin-babel");

  let reactImports = `import react from "@vitejs/plugin-react";`;
  let plugins = "react(), tailwindcss()";
  if (usesSwc) {
    reactImports = `import react from "@vitejs/plugin-react-swc";`;
  } else if (usesReactCompiler) {
    reactImports = `import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";`;
    plugins = "react(), babel({ presets: [reactCompilerPreset()] }), tailwindcss()";
  }

  return `import path from "path";
import tailwindcss from "@tailwindcss/vite";
${reactImports}
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [${plugins}],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
`;
}

function vitePreparation(context: ProjectContext): {
  packages: PackageRequirement[];
  filesToCreate: PlannedFile[];
  jsonEdits: PlannedJsonEdit[];
} {
  const isTypescript = context.language === "typescript";
  const packages: PackageRequirement[] = [
    {
      name: "tailwindcss",
      version: "latest",
      dependencyType: "dependency",
      reason: "Required by shadcn/ui.",
    },
    {
      name: "@tailwindcss/vite",
      version: "latest",
      dependencyType: "dependency",
      reason: "Official Tailwind CSS plugin for Vite.",
    },
  ];
  if (isTypescript && !("@types/node" in context.installedPackages)) {
    packages.push({
      name: "@types/node",
      version: "latest",
      dependencyType: "devDependency",
      reason: "Types for path.resolve in vite.config (per the shadcn guide).",
    });
  }
  const configFileName = isTypescript ? "vite.config.ts" : "vite.config.js";
  let existingConfig = "";
  try {
    existingConfig = fs.readFileSync(path.join(context.rootDirectory, configFileName), "utf8");
  } catch {
    // No existing config; the plain React template content is generated.
  }
  const filesToCreate: PlannedFile[] = [
    {
      path: "src/index.css",
      contents: `@import "tailwindcss";\n`,
      description: "Tailwind CSS entry (replaces the Vite template styles, per the shadcn guide).",
      requiredReason: "shadcn/ui fails without the Tailwind CSS import in this file",
    },
    {
      path: configFileName,
      contents: viteConfigContents(existingConfig),
      description: "Vite config with the Tailwind plugin and the @/* alias, per the shadcn guide.",
      requiredReason: "shadcn/ui needs the Tailwind plugin and @/* alias configured here",
    },
  ];
  // No baseUrl: TypeScript 6 deprecates it (TS5101) and paths alone resolve
  // relative to the tsconfig, which both tsc and the shadcn CLI accept.
  const jsonEdits: PlannedJsonEdit[] = [];
  if (isTypescript) {
    jsonEdits.push({
      path: "tsconfig.json",
      description: "Registers the @/* import alias for the shadcn CLI.",
      edits: [{ jsonPath: ["compilerOptions", "paths"], value: aliasPaths }],
    });
    if (fs.existsSync(path.join(context.rootDirectory, "tsconfig.app.json"))) {
      jsonEdits.push({
        path: "tsconfig.app.json",
        description: "Registers the @/* import alias for the app build.",
        edits: [{ jsonPath: ["compilerOptions", "paths"], value: aliasPaths }],
      });
    }
  } else {
    filesToCreate.push({
      path: "jsconfig.json",
      contents: `${JSON.stringify({ compilerOptions: { paths: aliasPaths } }, null, 2)}\n`,
      description: "Registers the @/* import alias for the shadcn CLI.",
    });
  }
  return { packages, filesToCreate, jsonEdits };
}

export const shadcnRecipe: IntegrationRecipe = {
  id: "shadcn",
  recipeVersion: 1,
  name: "shadcn/ui",
  category: "ui",
  status: "stable",
  installationSummary: "Official shadcn CLI (Vite projects get Tailwind + alias set up first)",
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
  createPlan(context) {
    const needsVitePrep = context.buildTool === "vite";
    const prep = needsVitePrep
      ? vitePreparation(context)
      : { packages: [], filesToCreate: [], jsonEdits: [] };
    return {
      packages: prep.packages,
      filesToCreate: prep.filesToCreate,
      jsonEdits: prep.jsonEdits,
      scripts: [],
      postInstallNotes: [
        ...(needsVitePrep
          ? [
              "Tailwind CSS and the @/* alias were configured following the official shadcn Vite guide.",
            ]
          : []),
        "Render <Button> from @/components/ui/button in any page to test shadcn/ui.",
        "Add more components anytime with: npx shadcn@latest add <component>.",
      ],
      initializer,
    };
  },
};
