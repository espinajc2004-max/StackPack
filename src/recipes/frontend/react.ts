import type { Recipe } from "../types.js";

const VITE_CONFIG_PLAIN = `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
});
`;

const VITE_CONFIG_COMPILER = `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler", {}]],
      },
    }),
  ],
});
`;

const TSCONFIG_REACT = `{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true,
    "isolatedModules": true
  },
  "include": ["src"]
}
`;

const indexHtml = (entry: string) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/${entry}"></script>
  </body>
</html>
`;

const MAIN_TSX = `import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
`;

const MAIN_JSX = MAIN_TSX.replace('("root")!', '("root")');

const APP_COMPONENT = `export default function App() {
  return <h1>Hello StackPack</h1>;
}
`;

export const reactRecipe: Recipe = {
  id: "react",
  name: "React",
  category: "framework",
  questions: [
    {
      id: "buildTool",
      message: "Choose a project environment",
      type: "select",
      options: [
        { value: "vite", label: "Vite" },
        { value: "existing", label: "Existing React project" },
      ],
    },
    {
      id: "reactCompiler",
      message: "Enable React Compiler?",
      type: "confirm",
      initialValue: false,
      when: { buildTool: "vite" },
    },
  ],
  dependencies: [{ packages: ["react", "react-dom"] }],
  devDependencies: [
    { when: { buildTool: "vite" }, packages: ["vite", "@vitejs/plugin-react"] },
    {
      when: { language: "typescript" },
      packages: ["typescript", "@types/react", "@types/react-dom"],
    },
    { when: { reactCompiler: true }, packages: ["babel-plugin-react-compiler"] },
  ],
  files: [
    {
      when: { buildTool: "vite", language: "typescript", reactCompiler: false },
      path: "vite.config.ts",
      content: VITE_CONFIG_PLAIN,
    },
    {
      when: { buildTool: "vite", language: "typescript", reactCompiler: true },
      path: "vite.config.ts",
      content: VITE_CONFIG_COMPILER,
    },
    {
      when: { buildTool: "vite", language: "javascript", reactCompiler: false },
      path: "vite.config.js",
      content: VITE_CONFIG_PLAIN,
    },
    {
      when: { buildTool: "vite", language: "javascript", reactCompiler: true },
      path: "vite.config.js",
      content: VITE_CONFIG_COMPILER,
    },
    {
      when: { buildTool: "vite", language: "typescript" },
      path: "tsconfig.json",
      content: TSCONFIG_REACT,
    },
    {
      when: { buildTool: "vite", language: "typescript" },
      path: "index.html",
      content: indexHtml("main.tsx"),
    },
    {
      when: { buildTool: "vite", language: "javascript" },
      path: "index.html",
      content: indexHtml("main.jsx"),
    },
    {
      when: { buildTool: "vite", language: "typescript" },
      path: "src/main.tsx",
      content: MAIN_TSX,
    },
    {
      when: { buildTool: "vite", language: "javascript" },
      path: "src/main.jsx",
      content: MAIN_JSX,
    },
    {
      when: { buildTool: "vite", language: "typescript" },
      path: "src/App.tsx",
      content: APP_COMPONENT,
    },
    {
      when: { buildTool: "vite", language: "javascript" },
      path: "src/App.jsx",
      content: APP_COMPONENT,
    },
  ],
  scripts: [
    {
      when: { buildTool: "vite", language: "typescript" },
      scripts: { dev: "vite", build: "tsc -b && vite build", preview: "vite preview" },
    },
    {
      when: { buildTool: "vite", language: "javascript" },
      scripts: { dev: "vite", build: "vite build", preview: "vite preview" },
    },
  ],
  notes: [
    {
      when: { reactCompiler: true },
      message:
        "React Compiler: the generated Vite config enables babel-plugin-react-compiler.",
    },
    {
      when: { reactCompiler: true, buildTool: "existing" },
      message:
        "React Compiler requires build configuration changes that StackPack cannot apply to an existing project automatically — the compiler package is installed, but you must wire it into your build yourself.",
    },
    {
      when: { buildTool: "existing" },
      message:
        "Existing project: no build configuration files are generated; only packages are installed.",
    },
  ],
};
