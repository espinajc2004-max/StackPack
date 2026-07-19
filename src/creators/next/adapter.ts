import { guard, p } from "../../ui/prompts.js";
import type { CreatorAdapter } from "../types.js";

/**
 * Official create-next-app adapter. With "recommended" StackPack asks the
 * language and passes --yes for everything else. With "custom" the command
 * carries no flags at all: create-next-app treats ANY "--" flag as "use the
 * defaults for everything", so the only way to get its step-by-step
 * questions (TypeScript, linter, Tailwind, src/, App Router, ...) is a bare
 * invocation. The package manager is inferred from how the creator is run.
 */
export const nextAdapter: CreatorAdapter = {
  id: "next",
  name: "Next.js",
  officialTool: "create-next-app",
  frameworkLabel: "Next.js",
  templateLabel(options) {
    if (options.setupStyle === "custom") {
      return "Your answers to create-next-app's own questions";
    }
    return options.language === "typescript"
      ? "Official Next.js defaults with TypeScript"
      : "Official Next.js defaults with JavaScript";
  },
  async collectOptions() {
    const setupStyle = guard(
      await p.select({
        message: "How should the Next.js project be configured?",
        options: [
          {
            value: "custom",
            label: "Answer create-next-app's questions step by step",
            hint: "TypeScript, linter, React Compiler, Tailwind, src/, App Router, import alias",
          },
          {
            value: "recommended",
            label: "Official recommended defaults",
            hint: "no further questions; currently Tailwind CSS, Biome, App Router",
          },
        ],
      }),
    ) as "recommended" | "custom";
    if (setupStyle === "custom") {
      // create-next-app asks the language itself; passing --typescript or
      // --javascript would silently switch it back to defaults-for-everything.
      return { setupStyle };
    }
    const language = guard(
      await p.select({
        message: "Choose a language",
        options: [
          { value: "typescript", label: "TypeScript" },
          { value: "javascript", label: "JavaScript" },
        ],
      }),
    ) as "typescript" | "javascript";
    return { language, setupStyle };
  },
  buildCommand(projectName, options, packageManager, parentDirectory) {
    const creatorArgs = [projectName];
    if (options.setupStyle !== "custom") {
      creatorArgs.push(
        options.language === "javascript" ? "--javascript" : "--typescript",
        `--use-${packageManager}`,
        "--yes",
      );
    }
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
