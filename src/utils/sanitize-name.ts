export const PRESET_NAME_PATTERN = /^[a-z0-9][a-z0-9._-]*$/;

/** Converts a display name ("My React Stack") to a safe file slug ("my-react-stack"). */
export function slugifyPresetName(displayName: string): string {
  return displayName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[-._]+|[-._]+$/g, "");
}

/** Folder names for new projects: cross-platform safe, no traversal. */
export function validateProjectFolderName(name: string): string | undefined {
  const trimmed = name.trim();
  if (!trimmed) return "A project name is required";
  if (trimmed.length > 128) return "Name is too long";
  if (/[<>:"/\\|?*\s]/.test(trimmed))
    return "Use letters, numbers, dots, dashes and underscores (no spaces)";
  if (trimmed === "." || trimmed.includes(".."))
    return "Name must not contain '..'";
  if (/[. ]$/.test(trimmed)) return "Name must not end with a dot or space";
  return undefined;
}

export function validatePresetName(name: string): string | undefined {
  if (!name) return "A name is required";
  if (name.length > 64) return "Name must be 64 characters or fewer";
  if (name.includes("/") || name.includes("\\") || name.includes(".."))
    return "Name must not contain path separators or '..'";
  if (!PRESET_NAME_PATTERN.test(name))
    return "Use lowercase letters, numbers, dots, dashes and underscores";
  return undefined;
}
