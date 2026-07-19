import type { CreatorAdapter } from "../types.js";

/**
 * Official create-vite adapter. Fresh setups pass no --template so the
 * official creator asks for the framework (React, Vue, Svelte, ...) and the
 * variant (TypeScript, JavaScript, SWC, ...) itself. Preset runs recorded a
 * React project, so they pin the matching official React template.
 */
export const viteAdapter: CreatorAdapter = {
  id: "vite",
  name: "Vite",
  officialTool: "create-vite",
  frameworkLabel: "Your pick from create-vite (React, Vue, Svelte, and more)",
  templateLabel(options) {
    if (!options.language) {
      return "You choose the framework and variant in create-vite's prompts";
    }
    return options.language === "typescript"
      ? "Official React TypeScript template (react-ts)"
      : "Official React template (react)";
  },
  async collectOptions() {
    // No StackPack questions: create-vite asks framework and variant itself.
    return { setupStyle: "custom" };
  },
  buildCommand(projectName, options, packageManager, parentDirectory) {
    const templateArgs = options.language
      ? ["--template", options.language === "typescript" ? "react-ts" : "react"]
      : [];
    switch (packageManager) {
      case "npm":
        return {
          command: "npm",
          args: [
            "create",
            "vite@latest",
            projectName,
            ...(templateArgs.length > 0 ? ["--", ...templateArgs] : []),
          ],
          cwd: parentDirectory,
          interactive: true,
        };
      case "pnpm":
        return {
          command: "pnpm",
          args: ["create", "vite", projectName, ...templateArgs],
          cwd: parentDirectory,
          interactive: true,
        };
      case "yarn":
        return {
          command: "yarn",
          args: ["create", "vite", projectName, ...templateArgs],
          cwd: parentDirectory,
          interactive: true,
        };
      case "bun":
        return {
          command: "bun",
          args: ["create", "vite", projectName, ...templateArgs],
          cwd: parentDirectory,
          interactive: true,
        };
    }
  },
};
