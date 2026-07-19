import type { IntegrationRecipe, PackageRequirement } from "../types.js";
import { detectByPackages } from "../detect.js";

const packages: PackageRequirement[] = [
  {
    name: "react-router-dom",
    version: "latest",
    dependencyType: "dependency",
    reason: "Official React Router package for web applications.",
  },
];

export const reactRouterRecipe: IntegrationRecipe = {
  id: "react-router",
  recipeVersion: 1,
  name: "React Router",
  category: "routing",
  status: "stable",
  installationSummary: "Official documented package installation",
  officialSource: {
    documentationUrl: "https://reactrouter.com/start/library/installation",
    lastVerifiedAt: "2026-07-19",
  },
  requires: [],
  runsAfter: [],
  conflictsWith: [],
  supportedProjects: [{ frameworks: ["react"], buildTools: ["vite"] }],
  installation: {
    type: "official-package-install",
    dependencies: packages,
    devDependencies: [],
  },
  detectInstalled(context) {
    return detectByPackages(context, ["react-router-dom", "react-router"]);
  },
  createPlan() {
    return {
      packages,
      filesToCreate: [],
      scripts: [],
      postInstallNotes: [
        "React Router was installed without generated routing files.",
        "Wrap your application in <BrowserRouter> (see the official docs) when you are ready to add routes.",
      ],
    };
  },
};
