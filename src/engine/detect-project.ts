import path from "node:path";
import fs from "node:fs";
import {
  projectContextSchema,
  type DetectionState,
  type ProjectContext,
  type RouterType,
} from "../schemas/project-context.js";
import { readPackageJson, getInstalledPackages } from "../project/package-json.js";
import { detectProjectFiles } from "../project/detect-files.js";
import { detectPackageManagers } from "../package-manager/detect.js";
import type { PackageManager } from "../package-manager/types.js";

function has(files: Set<string>, prefix: string): boolean {
  for (const file of files) {
    if (file.startsWith(prefix)) return true;
  }
  return false;
}

/**
 * Inspects a project directory and builds a normalized, validated context.
 * Never trusts prior selections: everything is derived from real files.
 */
export async function detectProject(
  rootDirectory: string,
  options: { packageManagerOverride?: PackageManager } = {},
): Promise<ProjectContext> {
  const root = path.resolve(rootDirectory);
  const { data: packageJson } = await readPackageJson(root);
  const files = await detectProjectFiles(root);
  const installedPackages = getInstalledPackages(packageJson);

  const hasNext = "next" in installedPackages;
  const hasReact = "react" in installedPackages;
  const hasVite = "vite" in installedPackages || has(files, "vite.config.");

  const framework = hasNext ? "next" : hasReact ? "react" : "unknown";
  const buildTool = hasNext ? "next" : hasVite ? "vite" : "unknown";

  const hasTsConfig = files.has("tsconfig.json");
  const hasTsDep = "typescript" in installedPackages;
  const hasTsEntry = has(files, "src/main.ts") || has(files, "src/App.ts");
  const hasJsEntry =
    has(files, "src/main.js") || has(files, "src/App.js") || files.has("jsconfig.json");
  const language =
    hasTsConfig || hasTsDep || hasTsEntry
      ? "typescript"
      : hasJsEntry || hasReact || hasNext
        ? "javascript"
        : "unknown";

  let routerType: RouterType | undefined;
  if (framework === "next") {
    const hasAppDir =
      has(files, "app/layout.") ||
      has(files, "app/page.") ||
      has(files, "src/app/layout.") ||
      has(files, "src/app/page.") ||
      fs.existsSync(path.join(root, "app")) ||
      fs.existsSync(path.join(root, "src", "app"));
    const hasPagesDir =
      has(files, "pages/") ||
      has(files, "src/pages/") ||
      fs.existsSync(path.join(root, "pages")) ||
      fs.existsSync(path.join(root, "src", "pages"));
    routerType = hasAppDir ? "app-router" : hasPagesDir ? "pages-router" : "unknown";
  } else if (framework === "react") {
    routerType =
      "react-router-dom" in installedPackages || "react-router" in installedPackages
        ? "client-router"
        : "unknown";
  }

  const candidates = detectPackageManagers(root);
  const packageManager: PackageManager = options.packageManagerOverride ?? candidates[0] ?? "npm";

  let detection: DetectionState;
  if (framework === "unknown") {
    detection = "unsupported";
  } else if (candidates.length > 1 && !options.packageManagerOverride) {
    detection = "ambiguous";
  } else if (framework === "react" && buildTool === "unknown") {
    detection = "partially-detected";
  } else {
    detection = "detected";
  }

  return projectContextSchema.parse({
    rootDirectory: root,
    framework,
    buildTool,
    language,
    packageManager,
    packageManagerCandidates: candidates,
    routerType,
    detection,
    packageJson,
    detectedFiles: [...files].sort(),
    installedPackages,
  });
}
