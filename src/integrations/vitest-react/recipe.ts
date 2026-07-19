import type { IntegrationRecipe, PackageRequirement, PlannedFile } from "../types.js";
import { detectByPackages, sourceExtension } from "../detect.js";
import type { ProjectContext } from "../../schemas/project-context.js";

const vitestPackage: PackageRequirement = {
  name: "vitest",
  version: "latest",
  dependencyType: "devDependency",
  reason: "Official Vitest test runner.",
};

const componentTestingPackages: PackageRequirement[] = [
  {
    name: "jsdom",
    version: "latest",
    dependencyType: "devDependency",
    reason: "Browser-like DOM environment for component tests.",
  },
  {
    name: "@testing-library/react",
    version: "latest",
    dependencyType: "devDependency",
    reason: "Official React Testing Library.",
  },
  {
    name: "@testing-library/jest-dom",
    version: "latest",
    dependencyType: "devDependency",
    reason: "DOM matchers for assertions.",
  },
  {
    name: "@testing-library/user-event",
    version: "latest",
    dependencyType: "devDependency",
    reason: "User interaction utilities.",
  },
];

function vitestConfigFile(context: ProjectContext, components: boolean): PlannedFile {
  const ext = context.language === "typescript" ? "ts" : "js";
  const hasViteConfig = context.detectedFiles.some((file) => file.startsWith("vite.config."));
  const testBlock = components
    ? `  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.${ext}"],
  },`
    : `  test: {
    environment: "node",
  },`;
  const contents = hasViteConfig
    ? `import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

export default mergeConfig(
  viteConfig,
  defineConfig({
${testBlock}
  }),
);
`
    : `import { defineConfig } from "vitest/config";

export default defineConfig({
${testBlock}
});
`;
  return {
    path: `vitest.config.${ext}`,
    contents,
    description: hasViteConfig
      ? "Vitest configuration merged with your existing Vite configuration (official pattern)."
      : "Standalone Vitest configuration.",
  };
}

function setupFile(context: ProjectContext): PlannedFile {
  const ext = sourceExtension(context, false);
  return {
    path: `src/test/setup.${ext}`,
    contents: `import "@testing-library/jest-dom/vitest";
`,
    description: "Registers Testing Library DOM matchers with Vitest.",
  };
}

export const vitestReactRecipe: IntegrationRecipe = {
  id: "vitest-react",
  recipeVersion: 1,
  name: "Vitest with React Testing Library",
  category: "testing",
  status: "stable",
  installationSummary: "Official documented package installation and configuration",
  officialSource: {
    documentationUrl: "https://vitest.dev/guide/",
    lastVerifiedAt: "2026-07-19",
  },
  requires: [],
  runsAfter: [],
  conflictsWith: [],
  supportedProjects: [{ frameworks: ["react"], buildTools: ["vite"] }],
  installation: {
    type: "official-package-install",
    dependencies: [],
    devDependencies: [vitestPackage, ...componentTestingPackages],
  },
  detectInstalled(context) {
    const vitest = detectByPackages(context, ["vitest"]);
    if (vitest.status !== "installed") return vitest;
    const hasConfig = context.detectedFiles.some(
      (file) => file.startsWith("vitest.config.") || file.startsWith("vite.config."),
    );
    if (!hasConfig) {
      return {
        status: "partially-configured",
        installedVersion: vitest.installedVersion,
        details: "vitest is installed but no configuration file was found.",
      };
    }
    return vitest;
  },
  describeOptions(options) {
    return options.testTarget === "utils" ? "utility tests only" : "React component testing";
  },
  createPlan(context, options) {
    const components = options.testTarget !== "utils";
    const packages = components ? [vitestPackage, ...componentTestingPackages] : [vitestPackage];
    const filesToCreate: PlannedFile[] = [vitestConfigFile(context, components)];
    if (components) filesToCreate.push(setupFile(context));
    return {
      packages,
      filesToCreate,
      scripts: [{ name: "test", command: "vitest" }],
      postInstallNotes: components
        ? ["Run your first component test with: npm run test"]
        : ["Vitest is configured for utility tests only."],
    };
  },
};
