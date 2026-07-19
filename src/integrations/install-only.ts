import type { IntegrationCategory, IntegrationRecipe, PackageRequirement } from "./types.js";
import { detectByPackages } from "./detect.js";

/**
 * Factory for recipes that install official packages and nothing else: no
 * generated files, no scripts. The developer does their own setup following
 * the official documentation (linked per recipe).
 */
function installOnlyRecipe(definition: {
  id: string;
  name: string;
  category: IntegrationCategory;
  documentationUrl: string;
  dependencies: PackageRequirement[];
  devDependencies?: PackageRequirement[];
  notes?: string[];
}): IntegrationRecipe {
  const dependencies = definition.dependencies;
  const devDependencies = definition.devDependencies ?? [];
  const packages = [...dependencies, ...devDependencies];
  const detectNames = dependencies.map((pkg) => pkg.name);
  return {
    id: definition.id,
    recipeVersion: 1,
    name: definition.name,
    category: definition.category,
    status: "stable",
    installationSummary: "Official documented package installation",
    officialSource: {
      documentationUrl: definition.documentationUrl,
      lastVerifiedAt: "2026-07-19",
    },
    requires: [],
    runsAfter: [],
    conflictsWith: [],
    supportedProjects: [{ frameworks: ["react", "next"] }],
    installation: { type: "official-package-install", dependencies, devDependencies },
    detectInstalled(context) {
      return detectByPackages(context, detectNames);
    },
    createPlan() {
      return {
        packages,
        filesToCreate: [],
        scripts: [],
        postInstallNotes: definition.notes ?? [],
      };
    },
  };
}

// --- State management -------------------------------------------------------

export const jotaiRecipe = installOnlyRecipe({
  id: "jotai",
  name: "Jotai",
  category: "state-management",
  documentationUrl: "https://jotai.org/docs/introduction",
  dependencies: [
    { name: "jotai", version: "latest", dependencyType: "dependency", reason: "Atomic state." },
  ],
  notes: ["Jotai needs no configuration: create atoms anywhere and use useAtom()."],
});

export const mobxRecipe = installOnlyRecipe({
  id: "mobx",
  name: "MobX",
  category: "state-management",
  documentationUrl: "https://mobx.js.org/README.html",
  dependencies: [
    { name: "mobx", version: "latest", dependencyType: "dependency", reason: "Core library." },
    {
      name: "mobx-react-lite",
      version: "latest",
      dependencyType: "dependency",
      reason: "Official React bindings.",
    },
  ],
  notes: ["Wrap components with observer() from mobx-react-lite to react to store changes."],
});

export const valtioRecipe = installOnlyRecipe({
  id: "valtio",
  name: "Valtio",
  category: "state-management",
  documentationUrl: "https://valtio.dev/docs/introduction/getting-started",
  dependencies: [
    {
      name: "valtio",
      version: "latest",
      dependencyType: "dependency",
      reason: "Proxy-based state.",
    },
  ],
  notes: ["Create state with proxy() and read it in components with useSnapshot()."],
});

export const xstateRecipe = installOnlyRecipe({
  id: "xstate",
  name: "XState",
  category: "state-management",
  documentationUrl: "https://stately.ai/docs/xstate",
  dependencies: [
    {
      name: "xstate",
      version: "latest",
      dependencyType: "dependency",
      reason: "State machines and statecharts.",
    },
    {
      name: "@xstate/react",
      version: "latest",
      dependencyType: "dependency",
      reason: "Official React hooks.",
    },
  ],
  notes: ["Define machines with createMachine() and use them via useMachine() from @xstate/react."],
});

// --- Forms and validation ----------------------------------------------------

export const valibotRecipe = installOnlyRecipe({
  id: "valibot",
  name: "Valibot",
  category: "forms-validation",
  documentationUrl: "https://valibot.dev/guides/introduction/",
  dependencies: [
    {
      name: "valibot",
      version: "latest",
      dependencyType: "dependency",
      reason: "Lightweight schema validation.",
    },
  ],
  notes: ["Valibot is modular and tree-shakeable; import only the validators you use."],
});

export const arktypeRecipe = installOnlyRecipe({
  id: "arktype",
  name: "ArkType",
  category: "forms-validation",
  documentationUrl: "https://arktype.io/docs/intro/setup",
  dependencies: [
    {
      name: "arktype",
      version: "latest",
      dependencyType: "dependency",
      reason: "TypeScript-first runtime validation.",
    },
  ],
  notes: ["ArkType shines with TypeScript: definitions are inferred as precise static types."],
});

// --- Data fetching -----------------------------------------------------------

export const axiosRecipe = installOnlyRecipe({
  id: "axios",
  name: "Axios",
  category: "data-fetching",
  documentationUrl: "https://axios-http.com/docs/intro",
  dependencies: [
    {
      name: "axios",
      version: "latest",
      dependencyType: "dependency",
      reason: "HTTP request client.",
    },
  ],
  notes: ["Axios is an HTTP client only; pair it with TanStack Query for caching if needed."],
});

// --- ORM / Database ----------------------------------------------------------
// Per design, ORM recipes install dependencies only. Schema, config, and
// migration files are the developer's own setup.

const ormNote = "Dependencies only — StackPack creates no ORM files; follow the official docs.";
const driverNote =
  "Remember to install your database driver too (e.g. pg, mysql2, better-sqlite3).";

export const prismaRecipe = installOnlyRecipe({
  id: "prisma",
  name: "Prisma",
  category: "orm",
  documentationUrl: "https://www.prisma.io/docs/getting-started",
  dependencies: [
    {
      name: "@prisma/client",
      version: "latest",
      dependencyType: "dependency",
      reason: "Generated query client.",
    },
  ],
  devDependencies: [
    {
      name: "prisma",
      version: "latest",
      dependencyType: "devDependency",
      reason: "CLI and migrations.",
    },
  ],
  notes: [ormNote, 'Start with "npx prisma init" to create schema.prisma and .env.'],
});

export const drizzleRecipe = installOnlyRecipe({
  id: "drizzle-orm",
  name: "Drizzle ORM",
  category: "orm",
  documentationUrl: "https://orm.drizzle.team/docs/get-started",
  dependencies: [
    {
      name: "drizzle-orm",
      version: "latest",
      dependencyType: "dependency",
      reason: "TypeScript SQL ORM.",
    },
  ],
  devDependencies: [
    {
      name: "drizzle-kit",
      version: "latest",
      dependencyType: "devDependency",
      reason: "Migrations and studio.",
    },
  ],
  notes: [ormNote, driverNote],
});

export const typeormRecipe = installOnlyRecipe({
  id: "typeorm",
  name: "TypeORM",
  category: "orm",
  documentationUrl: "https://typeorm.io",
  dependencies: [
    {
      name: "typeorm",
      version: "latest",
      dependencyType: "dependency",
      reason: "Entity-based ORM.",
    },
    {
      name: "reflect-metadata",
      version: "latest",
      dependencyType: "dependency",
      reason: "Required for decorators.",
    },
  ],
  notes: [
    ormNote,
    driverNote,
    'Enable "experimentalDecorators" and "emitDecoratorMetadata" in tsconfig.',
  ],
});

export const sequelizeRecipe = installOnlyRecipe({
  id: "sequelize",
  name: "Sequelize",
  category: "orm",
  documentationUrl: "https://sequelize.org/docs/v6/getting-started/",
  dependencies: [
    {
      name: "sequelize",
      version: "latest",
      dependencyType: "dependency",
      reason: "Mature traditional ORM.",
    },
  ],
  notes: [ormNote, driverNote],
});

export const mikroOrmRecipe = installOnlyRecipe({
  id: "mikro-orm",
  name: "MikroORM",
  category: "orm",
  documentationUrl: "https://mikro-orm.io/docs/quick-start",
  dependencies: [
    {
      name: "@mikro-orm/core",
      version: "latest",
      dependencyType: "dependency",
      reason: "Data Mapper ORM core.",
    },
  ],
  notes: [ormNote, "Add the matching driver package (e.g. @mikro-orm/postgresql) yourself."],
});

export const installOnlyRecipes: IntegrationRecipe[] = [
  jotaiRecipe,
  mobxRecipe,
  valtioRecipe,
  xstateRecipe,
  valibotRecipe,
  arktypeRecipe,
  axiosRecipe,
  prismaRecipe,
  drizzleRecipe,
  typeormRecipe,
  sequelizeRecipe,
  mikroOrmRecipe,
];
