import pc from "picocolors";
import type { ProjectContext } from "../schemas/project-context.js";

export function frameworkLabel(context: ProjectContext): string {
  switch (context.framework) {
    case "react":
      return "React";
    case "next":
      return "Next.js";
    default:
      return "Unknown";
  }
}

export function buildToolLabel(context: ProjectContext): string {
  switch (context.buildTool) {
    case "vite":
      return "Vite";
    case "next":
      return "Next.js";
    default:
      return "Unknown";
  }
}

export function languageLabel(context: ProjectContext): string {
  switch (context.language) {
    case "typescript":
      return "TypeScript";
    case "javascript":
      return "JavaScript";
    default:
      return "Unknown";
  }
}

export function routerLabel(context: ProjectContext): string | undefined {
  switch (context.routerType) {
    case "app-router":
      return "App Router";
    case "pages-router":
      return "Pages Router";
    case "client-router":
      return "Client-side router";
    default:
      return undefined;
  }
}

function dependencySection(title: string, packages: Record<string, string>): string | undefined {
  const entries = Object.entries(packages);
  if (entries.length === 0) return undefined;
  const cap = 12;
  const shown = entries
    .slice(0, cap)
    .map(([name, version]) => `  ${name} ${pc.green(version)}`)
    .join("\n");
  const more = entries.length > cap ? `\n  ${pc.dim(`…and ${entries.length - cap} more`)}` : "";
  return `${pc.dim(title)}\n${shown}${more}`;
}

export function describeContext(context: ProjectContext): string {
  const lines = [
    `${pc.dim("Framework")}\n  ${frameworkLabel(context)}`,
    `${pc.dim("Build tool")}\n  ${buildToolLabel(context)}`,
    `${pc.dim("Language")}\n  ${languageLabel(context)}`,
  ];
  const router = routerLabel(context);
  if (router) lines.push(`${pc.dim("Router")}\n  ${router}`);
  lines.push(`${pc.dim("Package manager")}\n  ${context.packageManager}`);
  const dependencies = dependencySection("Dependencies", context.packageJson.dependencies ?? {});
  if (dependencies) lines.push(dependencies);
  const devDependencies = dependencySection(
    "Development dependencies",
    context.packageJson.devDependencies ?? {},
  );
  if (devDependencies) lines.push(devDependencies);
  return lines.join("\n");
}
