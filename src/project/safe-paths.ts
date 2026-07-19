import path from "node:path";
import { StackPackError } from "../utils/errors.js";

/** Whether target (absolute or relative) stays inside root after resolution. */
export function isInsideRoot(root: string, target: string): boolean {
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(resolvedRoot, target);
  const relative = path.relative(resolvedRoot, resolvedTarget);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

/**
 * Resolves a relative path against a project root and guarantees the result
 * stays inside the root. Throws for traversal or absolute inputs.
 */
export function resolveInsideRoot(root: string, relativePath: string): string {
  if (path.isAbsolute(relativePath)) {
    throw new StackPackError(`Refusing absolute path "${relativePath}" inside the project.`);
  }
  if (!isInsideRoot(root, relativePath)) {
    throw new StackPackError(
      `Refusing path "${relativePath}" because it escapes the project directory.`,
    );
  }
  return path.resolve(path.resolve(root), relativePath);
}
