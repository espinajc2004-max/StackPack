import type { IntegrationRecipe, PackageRequirement } from "../types.js";
import { detectByPackages } from "../detect.js";

const packages: PackageRequirement[] = [
  {
    name: "react-hook-form",
    version: "latest",
    dependencyType: "dependency",
    reason: "Form state and validation lifecycle.",
  },
  {
    name: "zod",
    version: "latest",
    dependencyType: "dependency",
    reason: "Schema validation.",
  },
  {
    name: "@hookform/resolvers",
    version: "latest",
    dependencyType: "dependency",
    reason: "Connects React Hook Form to Zod.",
  },
];

export const reactHookFormZodRecipe: IntegrationRecipe = {
  id: "react-hook-form-zod",
  recipeVersion: 1,
  name: "React Hook Form with Zod",
  category: "forms-validation",
  status: "stable",
  installationSummary: "Official documented package installation",
  officialSource: {
    documentationUrl: "https://react-hook-form.com/get-started#SchemaValidation",
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
    const rhf = detectByPackages(context, ["react-hook-form"]);
    if (rhf.status !== "installed") return rhf;
    const resolvers = detectByPackages(context, ["@hookform/resolvers"]);
    if (resolvers.status !== "installed") {
      return {
        status: "partially-configured",
        installedVersion: rhf.installedVersion,
        details: "react-hook-form is installed but @hookform/resolvers is missing.",
      };
    }
    return rhf;
  },
  createPlan() {
    return {
      packages,
      filesToCreate: [],
      scripts: [],
      postInstallNotes: [
        "Use zodResolver from @hookform/resolvers/zod to connect your Zod schemas to useForm.",
      ],
    };
  },
};
