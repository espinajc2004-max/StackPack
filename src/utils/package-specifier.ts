import validatePackageName from "validate-npm-package-name";
import { parseVersionSpec } from "./versions.js";

export type ParsedPackageSpecifier = {
  name: string;
  /** A version, range, or npm dist-tag. Defaults to "latest". */
  version: string;
};

export type SpecifierParseResult =
  { ok: true; value: ParsedPackageSpecifier } | { ok: false; reason: string };

/**
 * Parses user input such as "axios", "axios@1", "@scope/pkg", or
 * "@scope/pkg@2.1.0". A missing version defaults to "latest".
 */
export function parsePackageSpecifier(input: string): SpecifierParseResult {
  const raw = input.trim();
  if (raw.length === 0) return { ok: false, reason: "Enter a package name." };
  if (/\s/.test(raw)) return { ok: false, reason: "Package names cannot contain spaces." };
  if (raw.includes("\\") || raw.includes("..") || raw.startsWith(".") || raw.startsWith("/")) {
    return { ok: false, reason: "Package names cannot look like filesystem paths." };
  }

  let name = raw;
  let version = "latest";

  const atIndex = raw.startsWith("@") ? raw.indexOf("@", 1) : raw.indexOf("@");
  if (atIndex > 0) {
    name = raw.slice(0, atIndex);
    version = raw.slice(atIndex + 1);
    if (version.length === 0) {
      return { ok: false, reason: 'A version after "@" cannot be empty.' };
    }
  }

  const nameResult = validatePackageName(name);
  if (!nameResult.validForNewPackages) {
    const problem = nameResult.errors?.[0] ?? nameResult.warnings?.[0] ?? "invalid package name";
    return { ok: false, reason: `"${name}" is not a valid npm package name (${problem}).` };
  }

  if (parseVersionSpec(version) === null) {
    return { ok: false, reason: `"${version}" is not a valid npm version, range, or tag.` };
  }

  return { ok: true, value: { name, version } };
}

export function formatPackageSpecifier(pkg: ParsedPackageSpecifier): string {
  return `${pkg.name}@${pkg.version}`;
}
