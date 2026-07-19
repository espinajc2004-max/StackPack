import type { IntegrationRecipe, PackageRequirement } from "../types.js";
import { detectByPackages } from "../detect.js";

const packages: PackageRequirement[] = [
  {
    name: "zustand",
    version: "latest",
    dependencyType: "dependency",
    reason: "Official Zustand package.",
  },
];

export const zustandRecipe: IntegrationRecipe = {
  id: "zustand",
  recipeVersion: 1,
  name: "Zustand",
  category: "state-management",
  status: "stable",
  installationSummary: "Official documented package installation",
  officialSource: {
    documentationUrl: "https://zustand.docs.pmnd.rs/getting-started/introduction",
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
    return detectByPackages(context, ["zustand"]);
  },
  createPlan() {
    return {
      packages,
      filesToCreate: [],
      scripts: [],
      postInstallNotes: ["Zustand requires no configuration by default."],
    };
  },
};
