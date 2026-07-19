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

export function describeContext(context: ProjectContext): string {
  const lines = [
    `${pc.dim("Framework")}\n  ${frameworkLabel(context)}`,
    `${pc.dim("Build tool")}\n  ${buildToolLabel(context)}`,
    `${pc.dim("Language")}\n  ${languageLabel(context)}`,
  ];
  const router = routerLabel(context);
  if (router) lines.push(`${pc.dim("Router")}\n  ${router}`);
  lines.push(`${pc.dim("Package manager")}\n  ${context.packageManager}`);
  return lines.join("\n");
}
