import path from "node:path";
import { describe, expect, it } from "vitest";
import { addToSelection } from "../src/commands/selection-utils.js";
import { viteAdapter } from "../src/creators/vite/adapter.js";
import { nextAdapter } from "../src/creators/next/adapter.js";
import { createEmptySelection } from "../src/dashboard/state.js";
import { buildInstallationPlan } from "../src/engine/build-plan.js";
import { allRecipes } from "../src/integrations/registry.js";
import { isProjectSupported } from "../src/integrations/types.js";
import { baseInstallCommand, packageInstallCommand } from "../src/package-manager/commands.js";
import type { PackageManager } from "../src/package-manager/types.js";
import type { ProjectContext } from "../src/schemas/project-context.js";
import { resolveInsideRoot } from "../src/project/safe-paths.js";
import { parsePackageSpecifier } from "../src/utils/package-specifier.js";

const packageManagers: PackageManager[] = ["npm", "pnpm", "yarn", "bun"];
const root = path.resolve("release-matrix-fixture");

function context(
  framework: "react" | "next",
  language: "typescript" | "javascript",
  packageManager: PackageManager = "npm",
): ProjectContext {
  const vite = framework === "react";
  return {
    rootDirectory: root,
    framework,
    buildTool: vite ? "vite" : "next",
    language,
    packageManager,
    packageManagerCandidates: [packageManager],
    detection: "detected",
    packageJson: {
      scripts: { build: vite ? "vite build" : "next build" },
      dependencies: {},
      devDependencies: {},
    },
    detectedFiles: vite
      ? [language === "typescript" ? "vite.config.ts" : "vite.config.js"]
      : ["next.config.mjs", language === "typescript" ? "app/page.tsx" : "app/page.jsx"],
    installedPackages: {},
  };
}

describe("0.3.5 release recipe matrix", () => {
  it("builds a safe, conflict-free individual plan for every supported recipe and project shape", () => {
    expect(allRecipes).toHaveLength(23);
    const contexts = [
      context("react", "typescript"),
      context("react", "javascript"),
      context("next", "typescript"),
      context("next", "javascript"),
    ];
    let supportedPlans = 0;

    for (const recipe of allRecipes) {
      for (const project of contexts) {
        if (!isProjectSupported(recipe, project)) continue;
        const selection = createEmptySelection();
        expect(addToSelection(selection, recipe.id, {}), recipe.id).toBe(true);

        const plan = buildInstallationPlan(project, selection);
        supportedPlans += 1;
        expect(
          plan.integrations.map((entry) => entry.recipe.id),
          recipe.id,
        ).toContain(recipe.id);
        expect(plan.conflicts, `${recipe.id} on ${project.framework}/${project.language}`).toEqual(
          [],
        );

        for (const dependency of [...plan.dependencies, ...plan.devDependencies]) {
          expect(
            parsePackageSpecifier(`${dependency.name}@${dependency.resolvedVersion}`).ok,
            `${recipe.id}: ${dependency.name}@${dependency.resolvedVersion}`,
          ).toBe(true);
        }
        for (const file of plan.filesToCreate) {
          expect(
            () => resolveInsideRoot(project.rootDirectory, file.path),
            file.path,
          ).not.toThrow();
        }
        for (const edit of plan.jsonEdits) {
          expect(
            () => resolveInsideRoot(project.rootDirectory, edit.path),
            edit.path,
          ).not.toThrow();
        }

        const detection = recipe.detectInstalled(project);
        expect(
          [
            "not-installed",
            "installed",
            "partially-configured",
            "fully-configured",
            "version-mismatch",
          ],
          recipe.id,
        ).toContain(detection.status);
      }
    }

    // React Router is Vite-only and the Vitest recipe currently targets Vite,
    // so those two recipes each skip the two Next.js project shapes.
    expect(supportedPlans).toBe(88);
  });

  it("builds every delegated initializer command for every package manager without a shell", () => {
    const initializerRecipes = allRecipes.filter(
      (recipe) => recipe.installation.type === "official-initializer",
    );
    expect(initializerRecipes.map((recipe) => recipe.id).sort()).toEqual(["playwright", "shadcn"]);

    for (const recipe of initializerRecipes) {
      if (recipe.installation.type !== "official-initializer") continue;
      for (const packageManager of packageManagers) {
        const command = recipe.installation.initializer.buildCommand(packageManager, root);
        expect(command.cwd).toBe(root);
        expect(command.interactive).toBe(true);
        expect(command.command.length).toBeGreaterThan(0);
        expect(command.args.length).toBeGreaterThan(0);
        expect(command).not.toHaveProperty("shell");
      }
    }
  });
});

describe("0.3.5 release package-manager and creator matrix", () => {
  it("builds runtime, development, and base install commands for every package manager", () => {
    for (const packageManager of packageManagers) {
      const runtime = packageInstallCommand(
        packageManager,
        [{ name: "nanoid", version: "^5.1.5" }],
        { dev: false, cwd: root },
      );
      const development = packageInstallCommand(
        packageManager,
        [{ name: "vitest", version: "^4.1.10" }],
        { dev: true, cwd: root },
      );
      const base = baseInstallCommand(packageManager, root);

      expect(runtime.cwd).toBe(root);
      expect(runtime.args).toContain("nanoid@^5.1.5");
      expect(development.cwd).toBe(root);
      expect(development.args).toContain("vitest@^4.1.10");
      expect(base).toEqual({
        command: packageManager,
        args: ["install"],
        cwd: root,
        interactive: true,
      });
    }
  });

  it("builds Vite and Next.js creator commands for every package manager and language", () => {
    for (const packageManager of packageManagers) {
      for (const language of ["typescript", "javascript"] as const) {
        const vite = viteAdapter.buildCommand("release-vite", { language }, packageManager, root);
        const next = nextAdapter.buildCommand(
          "release-next",
          { language, setupStyle: "recommended" },
          packageManager,
          root,
        );

        expect(vite.cwd).toBe(root);
        expect(vite.interactive).toBe(true);
        expect(vite.args).toContain(language === "typescript" ? "react-ts" : "react");
        expect(vite.args).toContain("--no-immediate");
        expect(next.cwd).toBe(root);
        expect(next.interactive).toBe(true);
        expect(next.args).toContain(language === "typescript" ? "--typescript" : "--javascript");
        expect(next.args).toContain(`--use-${packageManager}`);
        expect(next.args).toContain("--skip-install");
      }
    }
  });

  it("preserves every customized Next.js creator choice as an official CLI flag", () => {
    const command = nextAdapter.buildCommand(
      "custom-next",
      {
        language: "typescript",
        setupStyle: "custom",
        nextAnswers: {
          linter: "eslint",
          reactCompiler: true,
          tailwind: false,
          srcDir: true,
          appRouter: false,
          importAlias: "~/*",
          agentsMd: false,
        },
      },
      "npm",
      root,
    );

    expect(command.args).toEqual(
      expect.arrayContaining([
        "--eslint",
        "--react-compiler",
        "--no-tailwind",
        "--src-dir",
        "--no-app",
        "--import-alias",
        "~/*",
        "--no-agents-md",
        "--use-npm",
        "--skip-install",
      ]),
    );
  });
});
