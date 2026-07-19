import semver from "semver";

export const KNOWN_DIST_TAGS = ["latest", "next", "beta", "canary", "alpha", "rc"] as const;

export type VersionSpec = { kind: "range"; raw: string } | { kind: "tag"; raw: string };

const TAG_PATTERN = /^[a-zA-Z][a-zA-Z0-9._-]*$/;

/**
 * Parses an npm version input: an exact version ("18.3.1"), a range
 * ("18", "^18.3.1", "~18.3.1"), or a distribution tag ("latest", "beta").
 * Returns null when the input is not a valid version, range, or tag.
 */
export function parseVersionSpec(input: string): VersionSpec | null {
  const raw = input.trim();
  if (raw.length === 0) return null;
  if (/\s/.test(raw)) return null;
  if (semver.validRange(raw, { loose: true }) !== null) {
    return { kind: "range", raw };
  }
  if (TAG_PATTERN.test(raw)) {
    return { kind: "tag", raw };
  }
  return null;
}

export function isKnownDistTag(input: string): boolean {
  return (KNOWN_DIST_TAGS as readonly string[]).includes(input);
}

/**
 * Whether two version specs can be satisfied together. Tags only match the
 * exact same tag; ranges use semver intersection.
 */
export function versionSpecsCompatible(a: string, b: string): boolean {
  if (a === b) return true;
  const specA = parseVersionSpec(a);
  const specB = parseVersionSpec(b);
  if (specA === null || specB === null) return false;
  if (specA.kind === "tag" || specB.kind === "tag") return false;
  try {
    return semver.intersects(specA.raw, specB.raw, { loose: true });
  } catch {
    return false;
  }
}
