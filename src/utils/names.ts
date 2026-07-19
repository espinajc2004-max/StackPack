const WINDOWS_RESERVED = new Set([
  "con",
  "prn",
  "aux",
  "nul",
  ...Array.from({ length: 9 }, (_, i) => `com${i + 1}`),
  ...Array.from({ length: 9 }, (_, i) => `lpt${i + 1}`),
]);

export type NameValidation = { ok: true } | { ok: false; reason: string };

/** Validates a project folder name: safe, portable, no path traversal. */
export function validateProjectName(input: string): NameValidation {
  const name = input.trim();
  if (name.length === 0) return { ok: false, reason: "Project name is required." };
  if (name.length > 214) return { ok: false, reason: "Project name is too long." };
  if (name === "." || name === "..") {
    return { ok: false, reason: "Project name cannot be a relative path." };
  }
  if (/[/\\]/.test(name)) {
    return { ok: false, reason: "Project name cannot contain path separators." };
  }
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(name)) {
    return {
      ok: false,
      reason:
        "Use letters, numbers, dots, dashes, and underscores, starting with a letter or number.",
    };
  }
  if (name.includes("..")) {
    return { ok: false, reason: "Project name cannot contain path traversal sequences." };
  }
  if (WINDOWS_RESERVED.has(name.toLowerCase().split(".")[0] ?? "")) {
    return { ok: false, reason: `"${name}" is a reserved name on Windows.` };
  }
  return { ok: true };
}

/** Validates a preset name so it can never become an arbitrary filesystem path. */
export function validatePresetName(input: string): NameValidation {
  const name = input.trim();
  if (name.length === 0) return { ok: false, reason: "Preset name is required." };
  if (name.length > 100) return { ok: false, reason: "Preset name is too long." };
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(name) || name.includes("..")) {
    return {
      ok: false,
      reason:
        "Use letters, numbers, dots, dashes, and underscores, starting with a letter or number.",
    };
  }
  return { ok: true };
}
