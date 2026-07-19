import { guard, p } from "../../ui/prompts.js";
import type { CreatorAdapter, NextCustomAnswers } from "../types.js";

/**
 * Official create-next-app adapter. create-next-app treats ANY "--" flag as
 * "answer everything else with the defaults", so its own step-by-step
 * prompts cannot be combined with --skip-install. To keep a single combined
 * dependency install at the end, StackPack asks the same questions itself
 * (same choices and defaults as create-next-app 16) and passes every answer
 * as a flag, always together with --skip-install.
 */

async function askLanguage(): Promise<"typescript" | "javascript"> {
  return guard(
    await p.select({
      message: "Would you like to use TypeScript?",
      options: [
        { value: "typescript", label: "TypeScript", hint: "official recommendation" },
        { value: "javascript", label: "JavaScript" },
      ],
    }),
  ) as "typescript" | "javascript";
}

async function askCustomAnswers(): Promise<NextCustomAnswers> {
  const linter = guard(
    await p.select({
      message: "Which linter would you like to use?",
      options: [
        { value: "eslint", label: "ESLint" },
        { value: "biome", label: "Biome" },
        { value: "none", label: "None" },
      ],
    }),
  ) as NextCustomAnswers["linter"];
  const reactCompiler = guard(
    await p.confirm({ message: "Would you like to use React Compiler?", initialValue: false }),
  );
  const tailwind = guard(
    await p.confirm({ message: "Would you like to use Tailwind CSS?", initialValue: true }),
  );
  const srcDir = guard(
    await p.confirm({
      message: "Would you like your code inside a `src/` directory?",
      initialValue: false,
    }),
  );
  const appRouter = guard(
    await p.confirm({
      message: "Would you like to use App Router? (recommended)",
      initialValue: true,
    }),
  );
  const importAlias = guard(
    await p.text({
      message: "What import alias would you like configured?",
      initialValue: "@/*",
      validate(value) {
        return /^.+\/\*$/.test(value ?? "")
          ? undefined
          : "Import alias must follow the pattern <prefix>/*";
      },
    }),
  );
  const agentsMd = guard(
    await p.confirm({
      message: "Include AGENTS.md to guide coding agents?",
      initialValue: true,
    }),
  );
  return { linter, reactCompiler, tailwind, srcDir, appRouter, importAlias, agentsMd };
}

function customFlags(answers: NextCustomAnswers): string[] {
  return [
    answers.linter === "eslint"
      ? "--eslint"
      : answers.linter === "biome"
        ? "--biome"
        : "--no-linter",
    answers.reactCompiler ? "--react-compiler" : "--no-react-compiler",
    answers.tailwind ? "--tailwind" : "--no-tailwind",
    answers.srcDir ? "--src-dir" : "--no-src-dir",
    answers.appRouter ? "--app" : "--no-app",
    "--import-alias",
    answers.importAlias,
    answers.agentsMd ? "--agents-md" : "--no-agents-md",
  ];
}

export const nextAdapter: CreatorAdapter = {
  id: "next",
  name: "Next.js",
  officialTool: "create-next-app",
  frameworkLabel: "Next.js",
  templateLabel(options) {
    const language = options.language === "javascript" ? "JavaScript" : "TypeScript";
    if (options.setupStyle === "custom" && options.nextAnswers) {
      const a = options.nextAnswers;
      const parts = [
        language,
        a.linter === "none" ? "no linter" : a.linter === "biome" ? "Biome" : "ESLint",
        a.tailwind ? "Tailwind CSS" : "no Tailwind",
        a.appRouter ? "App Router" : "Pages Router",
      ];
      if (a.reactCompiler) parts.push("React Compiler");
      if (a.srcDir) parts.push("src/ directory");
      return `Customized: ${parts.join(", ")}`;
    }
    return `Official Next.js defaults with ${language}`;
  },
  async collectOptions() {
    const setupStyle = guard(
      await p.select({
        message: "How should the Next.js project be configured?",
        options: [
          {
            value: "custom",
            label: "Customize step by step",
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
    const language = await askLanguage();
    if (setupStyle === "recommended") return { language, setupStyle };
    const nextAnswers = await askCustomAnswers();
    return { language, setupStyle, nextAnswers };
  },
  buildCommand(projectName, options, packageManager, parentDirectory) {
    const creatorArgs = [
      projectName,
      options.language === "javascript" ? "--javascript" : "--typescript",
      ...(options.setupStyle === "custom" && options.nextAnswers
        ? customFlags(options.nextAnswers)
        : ["--yes"]),
      `--use-${packageManager}`,
      // Dependencies are installed once at the end, together with the
      // integrations chosen in the dashboard.
      "--skip-install",
    ];
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
