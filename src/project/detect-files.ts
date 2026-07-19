import fg from "fast-glob";

const MARKER_PATTERNS = [
  "package.json",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "bun.lock",
  "bun.lockb",
  "vite.config.*",
  "vitest.config.*",
  "next.config.*",
  "playwright.config.*",
  "components.json",
  "tsconfig.json",
  "jsconfig.json",
  "src/main.*",
  "src/App.*",
  "src/test/setup.*",
  "app/layout.*",
  "app/page.*",
  "src/app/layout.*",
  "src/app/page.*",
  "pages/_app.*",
  "pages/index.*",
  "src/pages/_app.*",
  "src/pages/index.*",
];

const IGNORED = ["**/node_modules/**", "**/dist/**", "**/build/**", "**/coverage/**", "**/.git/**"];

/**
 * Finds well-known project marker files. Never scans outside the given root
 * and skips dependency and build output directories.
 */
export async function detectProjectFiles(projectRoot: string): Promise<Set<string>> {
  const entries = await fg(MARKER_PATTERNS, {
    cwd: projectRoot,
    ignore: IGNORED,
    onlyFiles: true,
    dot: false,
    followSymbolicLinks: false,
  });
  return new Set(entries.map((entry) => entry.replaceAll("\\", "/")));
}
