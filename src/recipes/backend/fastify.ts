import type { Recipe } from "../types.js";

const SERVER_TS = `import Fastify from "fastify";

const app = Fastify({ logger: true });

app.get("/health", async () => ({ ok: true }));

const port = Number(process.env.PORT) || 3000;
app.listen({ port }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
`;

const SERVER_JS = `const Fastify = require("fastify");

const app = Fastify({ logger: true });

app.get("/health", async () => ({ ok: true }));

const port = Number(process.env.PORT) || 3000;
app.listen({ port }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
`;

const TSCONFIG_NODE = `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true
  },
  "include": ["src"]
}
`;

export const fastifyRecipe: Recipe = {
  id: "fastify",
  name: "Fastify",
  category: "framework",
  dependencies: [{ packages: ["fastify"] }],
  devDependencies: [
    {
      when: { language: "typescript" },
      packages: ["typescript", "tsx", "@types/node"],
    },
  ],
  files: [
    { when: { language: "typescript" }, path: "src/server.ts", content: SERVER_TS },
    { when: { language: "javascript" }, path: "src/server.js", content: SERVER_JS },
    { when: { language: "typescript" }, path: "tsconfig.json", content: TSCONFIG_NODE },
    { path: ".env.example", content: "PORT=3000\n" },
  ],
  scripts: [
    {
      when: { language: "typescript" },
      scripts: {
        dev: "tsx watch src/server.ts",
        build: "tsc",
        start: "node dist/server.js",
      },
    },
    {
      when: { language: "javascript" },
      scripts: { dev: "node --watch src/server.js", start: "node src/server.js" },
    },
  ],
};
