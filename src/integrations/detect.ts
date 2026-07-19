import type { ProjectContext } from "../schemas/project-context.js";
import type { IntegrationDetectionResult } from "./types.js";

/** Standard detection: any of the given packages present in package.json. */
export function detectByPackages(
  context: ProjectContext,
  packageNames: string[],
): IntegrationDetectionResult {
  for (const name of packageNames) {
    const version = context.installedPackages[name];
    if (version !== undefined) {
      return { status: "installed", installedVersion: version, details: `${name}@${version}` };
    }
  }
  return { status: "not-installed" };
}

export function sourceExtension(context: ProjectContext, jsx: boolean): string {
  if (context.language === "typescript") return jsx ? "tsx" : "ts";
  return jsx ? "jsx" : "js";
}
