import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export async function makeTempDir(prefix = "stackpack-test-"): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

export async function removeDir(dir: string): Promise<void> {
  await fs.rm(dir, { recursive: true, force: true });
}

export async function writeFileIn(dir: string, relative: string, contents: string): Promise<void> {
  const target = path.join(dir, relative);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, contents, "utf8");
}

export async function writeViteReactProject(
  dir: string,
  options: { typescript?: boolean; scripts?: Record<string, string>; lockfile?: string } = {},
): Promise<void> {
  const typescript = options.typescript !== false;
  const packageJson = {
    name: "fixture-app",
    version: "0.0.0",
    type: "module",
    scripts: options.scripts ?? { dev: "vite", build: "vite build" },
    dependencies: { react: "^19.0.0", "react-dom": "^19.0.0" },
    devDependencies: {
      vite: "^7.0.0",
      "@vitejs/plugin-react": "^5.0.0",
      ...(typescript ? { typescript: "~5.8.0" } : {}),
    },
  };
  await writeFileIn(dir, "package.json", JSON.stringify(packageJson, null, 2));
  await writeFileIn(dir, options.lockfile ?? "package-lock.json", "{}");
  await writeFileIn(dir, typescript ? "vite.config.ts" : "vite.config.js", "export default {};\n");
  if (typescript) {
    await writeFileIn(dir, "tsconfig.json", JSON.stringify({ compilerOptions: {} }, null, 2));
  }
  await writeFileIn(dir, typescript ? "src/main.tsx" : "src/main.jsx", "// entry\n");
}

export async function writeNextProject(dir: string): Promise<void> {
  const packageJson = {
    name: "fixture-next-app",
    version: "0.0.0",
    scripts: { dev: "next dev", build: "next build" },
    dependencies: { next: "15.0.0", react: "^19.0.0", "react-dom": "^19.0.0" },
    devDependencies: { typescript: "~5.8.0" },
  };
  await writeFileIn(dir, "package.json", JSON.stringify(packageJson, null, 2));
  await writeFileIn(dir, "package-lock.json", "{}");
  await writeFileIn(dir, "next.config.mjs", "export default {};\n");
  await writeFileIn(dir, "tsconfig.json", "{}");
  await writeFileIn(dir, "app/layout.tsx", "// layout\n");
  await writeFileIn(dir, "app/page.tsx", "// page\n");
}
