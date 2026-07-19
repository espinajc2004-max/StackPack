import type { Recipe } from "../types.js";

const schema = (provider: string) => `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "${provider}"
  url      = env("DATABASE_URL")
}
`;

const ENV_BY_DRIVER: Record<string, string> = {
  postgresql: 'DATABASE_URL="postgresql://user:password@localhost:5432/mydb"\n',
  mysql: 'DATABASE_URL="mysql://user:password@localhost:3306/mydb"\n',
  sqlite: 'DATABASE_URL="file:./dev.db"\n',
};

export const prismaRecipe: Recipe = {
  id: "prisma",
  name: "Prisma",
  category: "feature",
  feature: "orm",
  questions: [
    {
      id: "databaseDriver",
      message: "Choose a database",
      type: "select",
      options: [
        { value: "postgresql", label: "PostgreSQL" },
        { value: "mysql", label: "MySQL" },
        { value: "sqlite", label: "SQLite" },
      ],
    },
  ],
  dependencies: [{ packages: ["@prisma/client"] }],
  devDependencies: [{ packages: ["prisma"] }],
  files: [
    {
      when: { databaseDriver: "postgresql" },
      path: "prisma/schema.prisma",
      content: schema("postgresql"),
    },
    {
      when: { databaseDriver: "mysql" },
      path: "prisma/schema.prisma",
      content: schema("mysql"),
    },
    {
      when: { databaseDriver: "sqlite" },
      path: "prisma/schema.prisma",
      content: schema("sqlite"),
    },
    {
      when: { databaseDriver: "postgresql" },
      path: ".env.example",
      content: ENV_BY_DRIVER.postgresql,
    },
    {
      when: { databaseDriver: "mysql" },
      path: ".env.example",
      content: ENV_BY_DRIVER.mysql,
    },
    {
      when: { databaseDriver: "sqlite" },
      path: ".env.example",
      content: ENV_BY_DRIVER.sqlite,
    },
  ],
  notes: [
    {
      message:
        'Prisma: after installing, define your models in prisma/schema.prisma and run "npx prisma generate".',
    },
  ],
};
