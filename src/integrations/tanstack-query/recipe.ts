import type { IntegrationRecipe, PackageRequirement, PlannedFile } from "../types.js";
import { detectByPackages, sourceExtension } from "../detect.js";
import type { ProjectContext } from "../../schemas/project-context.js";

const mainPackage: PackageRequirement = {
  name: "@tanstack/react-query",
  version: "latest",
  dependencyType: "dependency",
  reason: "Official TanStack Query package for React.",
};

const devtoolsPackage: PackageRequirement = {
  name: "@tanstack/react-query-devtools",
  version: "latest",
  dependencyType: "dependency",
  reason: "Officially documented development tools for TanStack Query.",
};

function providerFiles(context: ProjectContext, devtools: boolean): PlannedFile[] {
  const ext = sourceExtension(context, false);
  const jsxExt = sourceExtension(context, true);
  const files: PlannedFile[] = [
    {
      path: `src/lib/query-client.${ext}`,
      contents: `import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient();
`,
      description: "Shared QueryClient instance.",
    },
    {
      path: `src/lib/query-provider.${jsxExt}`,
      contents: `import { QueryClientProvider } from "@tanstack/react-query";
${devtools ? `import { ReactQueryDevtools } from "@tanstack/react-query-devtools";\n` : ""}import { queryClient } from "./query-client";

${
  context.language === "typescript"
    ? "export function AppQueryProvider({ children }: { children: React.ReactNode }) {"
    : "export function AppQueryProvider({ children }) {"
}
  return (
    <QueryClientProvider client={queryClient}>
      {children}
${devtools ? "      <ReactQueryDevtools initialIsOpen={false} />\n" : ""}    </QueryClientProvider>
  );
}
`,
      description: "Provider component ready to wrap your application entry.",
    },
  ];
  return files;
}

export const tanstackQueryRecipe: IntegrationRecipe = {
  id: "tanstack-query",
  recipeVersion: 1,
  name: "TanStack Query",
  category: "data-fetching",
  status: "stable",
  installationSummary: "Official documented package installation",
  officialSource: {
    documentationUrl: "https://tanstack.com/query/latest/docs/framework/react/installation",
    lastVerifiedAt: "2026-07-19",
  },
  requires: [],
  runsAfter: [],
  conflictsWith: [],
  supportedProjects: [{ frameworks: ["react", "next"] }],
  installation: {
    type: "official-package-install",
    dependencies: [mainPackage],
    devDependencies: [],
  },
  detectInstalled(context) {
    return detectByPackages(context, ["@tanstack/react-query"]);
  },
  describeOptions(options) {
    const parts: string[] = [];
    if (options.devtools === true) parts.push("Devtools");
    if (options.configureProvider === true) parts.push("provider files");
    return parts.length > 0 ? `with ${parts.join(" + ")}` : undefined;
  },
  createPlan(context, options) {
    const devtools = options.devtools === true;
    const configureProvider = options.configureProvider === true;
    const packages = devtools ? [mainPackage, devtoolsPackage] : [mainPackage];
    const notes: string[] = [];
    if (configureProvider) {
      notes.push(
        "StackPack does not rewrite your application entry file automatically.",
        "Wrap your app with <AppQueryProvider> from src/lib/query-provider to finish the setup.",
      );
    } else {
      notes.push("Packages installed only. Create a QueryClient and provider when ready.");
    }
    return {
      packages,
      filesToCreate: configureProvider ? providerFiles(context, devtools) : [],
      scripts: [],
      postInstallNotes: notes,
    };
  },
};
