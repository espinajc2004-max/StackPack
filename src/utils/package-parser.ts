export const NPM_NAME_PATTERN =
  /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;

const DIST_TAG_PATTERN = /^[a-z][a-z0-9-]*$/i;
const VERSION_PATTERN = /^[\^~]?\d+(\.\d+){0,2}([-.][0-9a-z-.]+)?$/i;

export interface ParsedPackage {
  name: string;
  version: string;
}

/**
 * Parses "name", "name@version", "@scope/name", "@scope/name@version".
 * The first "@" of a scoped package is never treated as the version separator.
 */
export function parsePackageInput(raw: string): ParsedPackage {
  const trimmed = raw.trim();
  const at = trimmed.startsWith("@")
    ? trimmed.indexOf("@", 1)
    : trimmed.indexOf("@");
  if (at === -1) return { name: trimmed, version: "latest" };
  return {
    name: trimmed.slice(0, at),
    version: trimmed.slice(at + 1) || "latest",
  };
}

export function formatPackage(name: string, version: string): string {
  return `${name}@${version}`;
}

export function isValidPackageName(name: string): boolean {
  return name.length > 0 && name.length <= 214 && NPM_NAME_PATTERN.test(name);
}

/** Accepts semver-ish versions, ranges (^ ~), and dist-tags such as latest/next/beta. */
export function isValidVersionInput(version: string): boolean {
  return VERSION_PATTERN.test(version) || DIST_TAG_PATTERN.test(version);
}

export function isExactVersion(version: string): boolean {
  return /^\d+\.\d+\.\d+([-.][0-9a-z-.]+)?$/i.test(version);
}

export function isDistTag(version: string): boolean {
  return DIST_TAG_PATTERN.test(version) && !VERSION_PATTERN.test(version);
}
