import type { CreatorAdapter } from "../types.js";

/**
 * Official create-vite adapter. StackPack never recreates the Vite template
 * manually; it always runs the official creator.
 */
export const viteReactAdapter: CreatorAdapter = {
  id: "vite-react",
  name: "React with Vite",
  officialTool: "create-vite",
  frameworkLabel: "React",
  templateLabel(options) {
    return options.language === "typescript"
      ? "Official React TypeScript template (react-ts)"
      : "Official React template (react)";
  },
  buildCommand(projectName, options, packageManager, parentDirectory) {
    const template = options.language === "typescript" ? "react-ts" : "react";
    switch (packageManager) {
      case "npm":
        return {
          command: "npm",
          args: ["create", "vite@latest", projectName, "--", "--template", template],
          cwd: parentDirectory,
          interactive: true,
        };
      case "pnpm":
        return {
          command: "pnpm",
          args: ["create", "vite", projectName, "--template", template],
          cwd: parentDirectory,
          interactive: true,
        };
      case "yarn":
        return {
          command: "yarn",
          args: ["create", "vite", projectName, "--template", template],
          cwd: parentDirectory,
          interactive: true,
        };
      case "bun":
        return {
          command: "bun",
          args: ["create", "vite", projectName, "--template", template],
          cwd: parentDirectory,
          interactive: true,
        };
    }
  },
};
