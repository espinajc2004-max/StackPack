import type { Recipe } from "../types.js";

const VITE_CONFIG_VUE = `import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
});
`;

const TSCONFIG_VUE = `{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true,
    "isolatedModules": true,
    "jsx": "preserve"
  },
  "include": ["src"]
}
`;

const ENV_DTS = `/// <reference types="vite/client" />

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<Record<string, never>, Record<string, never>, unknown>;
  export default component;
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
    <div id="app"></div>
    <script type="module" src="/src/${entry}"></script>
  </body>
</html>
`;

const MAIN_VUE = `import { createApp } from "vue";
import App from "./App.vue";

createApp(App).mount("#app");
`;

const APP_VUE_TS = `<script setup lang="ts">
</script>

<template>
  <h1>Hello StackPack</h1>
</template>
`;

const APP_VUE_JS = `<script setup>
</script>

<template>
  <h1>Hello StackPack</h1>
</template>
`;

export const vueRecipe: Recipe = {
  id: "vue",
  name: "Vue",
  category: "framework",
  dependencies: [{ packages: ["vue"] }],
  devDependencies: [
    { packages: ["vite", "@vitejs/plugin-vue"] },
    { when: { language: "typescript" }, packages: ["typescript", "vue-tsc"] },
  ],
  files: [
    {
      when: { language: "typescript" },
      path: "vite.config.ts",
      content: VITE_CONFIG_VUE,
    },
    {
      when: { language: "javascript" },
      path: "vite.config.js",
      content: VITE_CONFIG_VUE,
    },
    { when: { language: "typescript" }, path: "tsconfig.json", content: TSCONFIG_VUE },
    { when: { language: "typescript" }, path: "src/env.d.ts", content: ENV_DTS },
    {
      when: { language: "typescript" },
      path: "index.html",
      content: indexHtml("main.ts"),
    },
    {
      when: { language: "javascript" },
      path: "index.html",
      content: indexHtml("main.js"),
    },
    { when: { language: "typescript" }, path: "src/main.ts", content: MAIN_VUE },
    { when: { language: "javascript" }, path: "src/main.js", content: MAIN_VUE },
    { when: { language: "typescript" }, path: "src/App.vue", content: APP_VUE_TS },
    { when: { language: "javascript" }, path: "src/App.vue", content: APP_VUE_JS },
  ],
  scripts: [
    {
      when: { language: "typescript" },
      scripts: {
        dev: "vite",
        build: "vue-tsc -b && vite build",
        preview: "vite preview",
      },
    },
    {
      when: { language: "javascript" },
      scripts: { dev: "vite", build: "vite build", preview: "vite preview" },
    },
  ],
};
