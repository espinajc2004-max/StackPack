import type { Recipe } from "../types.js";

const SERVER_TS = `import { serve } from "@hono/node-server";
import { Hono } from "hono";

const app = new Hono();

app.get("/health", (c) => c.json({ ok: true }));

const port = Number(process.env.PORT) || 3000;
serve({ fetch: app.fetch, port });
console.log(\`Server listening on http://localhost:\${port}\`);
`;

const SERVER_JS = `const { serve } = require("@hono/node-server");
const { Hono } = require("hono");

const app = new Hono();

app.get("/health", (c) => c.json({ ok: true }));

const port = Number(process.env.PORT) || 3000;
serve({ fetch: app.fetch, port });
console.log(\`Server listening on http://localhost:\${port}\`);
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

export const honoRecipe: Recipe = {
  id: "hono",
  name: "Hono",
  category: "framework",
  dependencies: [{ packages: ["hono", "@hono/node-server"] }],
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
