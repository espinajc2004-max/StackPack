import type { IntegrationRecipe, PackageRequirement, PlannedFile } from "../types.js";
import { detectByPackages, sourceExtension } from "../detect.js";
import type { ProjectContext } from "../../schemas/project-context.js";

const packages: PackageRequirement[] = [
  {
    name: "@reduxjs/toolkit",
    version: "latest",
    dependencyType: "dependency",
    reason: "Official Redux Toolkit package.",
  },
  {
    name: "react-redux",
    version: "latest",
    dependencyType: "dependency",
    reason: "Official React binding for Redux.",
  },
];

function storeFiles(context: ProjectContext): PlannedFile[] {
  const ts = context.language === "typescript";
  const ext = sourceExtension(context, false);
  const storeContents = ts
    ? `import { configureStore } from "@reduxjs/toolkit";

export const store = configureStore({
  reducer: {},
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
`
    : `import { configureStore } from "@reduxjs/toolkit";

export const store = configureStore({
  reducer: {},
});
`;
  const files: PlannedFile[] = [
    {
      path: `src/store/store.${ext}`,
      contents: storeContents,
      description: "Basic Redux store following the official Redux Toolkit quick start.",
    },
  ];
  if (ts) {
    files.push({
      path: "src/store/hooks.ts",
      contents: `import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "./store";

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
`,
      description: "Typed hooks recommended by the official Redux Toolkit TypeScript guide.",
    });
  }
  return files;
}

export const reduxToolkitRecipe: IntegrationRecipe = {
  id: "redux-toolkit",
  recipeVersion: 1,
  name: "Redux Toolkit",
  category: "state-management",
  status: "stable",
  installationSummary: "Official React package installation",
  officialSource: {
    documentationUrl: "https://redux-toolkit.js.org/introduction/getting-started",
    lastVerifiedAt: "2026-07-19",
  },
  requires: [],
  runsAfter: [],
  conflictsWith: [],
  supportedProjects: [{ frameworks: ["react", "next"] }],
  installation: {
    type: "official-package-install",
    dependencies: packages,
    devDependencies: [],
  },
  detectInstalled(context) {
    return detectByPackages(context, ["@reduxjs/toolkit"]);
  },
  describeOptions(options) {
    return options.generateStore === true ? "with basic store files" : undefined;
  },
  createPlan(context, options) {
    const generateStore = options.generateStore === true;
    return {
      packages,
      filesToCreate: generateStore ? storeFiles(context) : [],
      scripts: [],
      postInstallNotes: generateStore
        ? ["Wrap your application in <Provider store={store}> to activate the store."]
        : ["Packages installed only. No store files were generated."],
    };
  },
};
