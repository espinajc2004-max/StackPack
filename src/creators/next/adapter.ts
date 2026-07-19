import type { CreatorAdapter } from "../types.js";

/**
 * Official create-next-app adapter. Language and package manager are the only
 * options StackPack exposes; everything else uses the official defaults
 * (--yes). The creator may still show its own prompts when it needs to.
 */
export const nextAdapter: CreatorAdapter = {
  id: "next",
  name: "Next.js",
  officialTool: "create-next-app",
  frameworkLabel: "Next.js",
  templateLabel(options) {
    return options.language === "typescript"
      ? "Official Next.js defaults with TypeScript"
      : "Official Next.js defaults with JavaScript";
  },
  buildCommand(projectName, options, packageManager, parentDirectory) {
    const languageFlag = options.language === "typescript" ? "--typescript" : "--javascript";
    const pmFlag = `--use-${packageManager}`;
    const creatorArgs = [projectName, languageFlag, pmFlag, "--yes"];
    switch (packageManager) {
      case "npm":
        return {
          command: "npx",
          args: ["create-next-app@latest", ...creatorArgs],
          cwd: parentDirectory,
          interactive: true,
        };
      case "pnpm":
        return {
          command: "pnpm",
          args: ["create", "next-app", ...creatorArgs],
          cwd: parentDirectory,
          interactive: true,
        };
      case "yarn":
        return {
          command: "yarn",
          args: ["create", "next-app", ...creatorArgs],
          cwd: parentDirectory,
          interactive: true,
        };
      case "bun":
        return {
          command: "bunx",
          args: ["create-next-app@latest", ...creatorArgs],
          cwd: parentDirectory,
          interactive: true,
        };
    }
  },
};
