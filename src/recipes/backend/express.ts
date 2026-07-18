import type { Recipe } from "../types.js";

const SERVER_TS = `import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(\`Server listening on http://localhost:\${port}\`);
});
`;

const SERVER_JS = `require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(\`Server listening on http://localhost:\${port}\`);
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

const ESLINT_CONFIG_JS = `const js = require("@eslint/js");

module.exports = [js.configs.recommended];
`;

export const expressRecipe: Recipe = {
  id: "express",
  name: "Express",
  category: "framework",
  questions: [
    {
      id: "language",
      message: "Choose a language",
      type: "select",
      options: [
        { value: "typescript", label: "TypeScript" },
        { value: "javascript", label: "JavaScript" },
      ],
    },
  ],
  dependencies: [{ packages: ["express", "cors", "helmet", "dotenv"] }],
  devDependencies: [
    { when: { language: "javascript" }, packages: ["nodemon", "eslint", "@eslint/js"] },
    {
      when: { language: "typescript" },
      packages: ["typescript", "tsx", "@types/node", "@types/express", "@types/cors"],
    },
  ],
  files: [
    { when: { language: "typescript" }, path: "src/server.ts", content: SERVER_TS },
    { when: { language: "javascript" }, path: "src/server.js", content: SERVER_JS },
    { when: { language: "typescript" }, path: "tsconfig.json", content: TSCONFIG_NODE },
    {
      when: { language: "javascript" },
      path: "eslint.config.js",
      content: ESLINT_CONFIG_JS,
    },
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
      scripts: { dev: "nodemon src/server.js", start: "node src/server.js" },
    },
  ],
};
