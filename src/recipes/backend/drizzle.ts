import type { Recipe } from "../types.js";

export const drizzleRecipe: Recipe = {
  id: "drizzle",
  name: "Drizzle ORM",
  category: "feature",
  feature: "database",
  supports: ["express"],
  questions: [
    {
      id: "databaseDriver",
      message: "Choose a database driver",
      type: "select",
      options: [
        { value: "postgresql", label: "PostgreSQL" },
        { value: "mysql", label: "MySQL" },
        { value: "sqlite", label: "SQLite" },
      ],
    },
  ],
  dependencies: [
    { packages: ["drizzle-orm"] },
    { when: { databaseDriver: "postgresql" }, packages: ["pg"] },
    { when: { databaseDriver: "mysql" }, packages: ["mysql2"] },
    { when: { databaseDriver: "sqlite" }, packages: ["better-sqlite3"] },
  ],
  devDependencies: [
    { packages: ["drizzle-kit"] },
    {
      when: { databaseDriver: "postgresql", language: "typescript" },
      packages: ["@types/pg"],
    },
    {
      when: { databaseDriver: "sqlite", language: "typescript" },
      packages: ["@types/better-sqlite3"],
    },
  ],
};
