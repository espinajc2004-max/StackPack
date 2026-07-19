import fs from "node:fs/promises";
import path from "node:path";
import { applyEdits, modify, parse as parseJsonc } from "jsonc-parser";
import { packageJsonSchema, type PackageJson } from "../schemas/project-context.js";
import { StackPackError } from "../utils/errors.js";

export async function readPackageJson(
  projectRoot: string,
): Promise<{ raw: string; data: PackageJson }> {
  const filePath = path.join(projectRoot, "package.json");
  let raw: string;
  try {
    raw = await fs.readFile(filePath, "utf8");
  } catch (error) {
    throw new StackPackError("package.json was not found.", {
      hints: [
        "StackPack must run inside a supported JavaScript project.",
        `Current directory: ${projectRoot}`,
      ],
      cause: error,
    });
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new StackPackError("package.json could not be parsed as JSON.", {
      hints: [`File: ${filePath}`],
      cause: error,
    });
  }
  const validated = packageJsonSchema.safeParse(parsed);
  if (!validated.success) {
    throw new StackPackError("package.json has an unexpected structure.", {
      hints: validated.error.issues.slice(0, 3).map((i) => `${i.path.join(".")}: ${i.message}`),
    });
  }
  return { raw, data: validated.data };
}

/** Merged dependencies and devDependencies from package.json. */
export function getInstalledPackages(pkg: PackageJson): Record<string, string> {
  return { ...pkg.dependencies, ...pkg.devDependencies };
}

/**
 * Applies script changes to package.json using structured JSONC edits so
 * formatting and unrelated properties are preserved.
 */
export async function updatePackageJsonScripts(
  projectRoot: string,
  scripts: Record<string, string>,
): Promise<void> {
  const filePath = path.join(projectRoot, "package.json");
  let content = await fs.readFile(filePath, "utf8");
  for (const [name, command] of Object.entries(scripts)) {
    const edits = modify(content, ["scripts", name], command, {
      formattingOptions: { insertSpaces: true, tabSize: 2 },
    });
    content = applyEdits(content, edits);
  }
  const reparsed: unknown = parseJsonc(content);
  if (typeof reparsed !== "object" || reparsed === null) {
    throw new StackPackError("Refusing to write package.json: edit produced invalid JSON.");
  }
  await fs.writeFile(filePath, content, "utf8");
}
