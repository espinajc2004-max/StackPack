import type { DependencyType, PackageRequirement } from "../integrations/types.js";
import { versionSpecsCompatible } from "../utils/versions.js";

export type RequestedPackage = PackageRequirement & { requestedBy: string };

export type ResolvedPackage = {
  name: string;
  requestedVersions: string[];
  resolvedVersion: string;
  dependencyType: DependencyType;
  requestedBy: string[];
};

export type DependencyConflict = {
  name: string;
  versions: string[];
  requestedBy: string[];
  message: string;
};

export type DependencyResolution = {
  packages: ResolvedPackage[];
  conflicts: DependencyConflict[];
  warnings: string[];
};

/**
 * Merges every package requirement (recipes + custom packages), applies user
 * version overrides, and detects conflicts instead of silently choosing.
 */
export function resolveDependencies(input: {
  requirements: RequestedPackage[];
  versionOverrides: Record<string, string>;
  installedPackages: Record<string, string>;
}): DependencyResolution {
  const byName = new Map<string, RequestedPackage[]>();
  for (const requirement of input.requirements) {
    const list = byName.get(requirement.name) ?? [];
    list.push(requirement);
    byName.set(requirement.name, list);
  }

  const packages: ResolvedPackage[] = [];
  const conflicts: DependencyConflict[] = [];
  const warnings: string[] = [];

  for (const [name, requests] of byName) {
    const requestedBy = [...new Set(requests.map((r) => r.requestedBy))];
    const requestedVersions = [...new Set(requests.map((r) => r.version))];

    const dependencyTypes = new Set(requests.map((r) => r.dependencyType));
    let dependencyType: DependencyType = requests[0]?.dependencyType ?? "dependency";
    if (dependencyTypes.size > 1) {
      dependencyType = "dependency";
      warnings.push(
        `${name} was requested as both a dependency and a devDependency; installing as a dependency.`,
      );
    }

    const override = input.versionOverrides[name];
    let resolvedVersion: string;
    if (override !== undefined) {
      resolvedVersion = override;
      if (!requestedBy.includes("version override")) requestedBy.push("version override");
    } else if (requestedVersions.length === 1) {
      resolvedVersion = requestedVersions[0] ?? "latest";
    } else {
      const specific = requestedVersions.filter((v) => v !== "latest");
      if (specific.length === 1) {
        resolvedVersion = specific[0] ?? "latest";
        warnings.push(
          `${name} was requested as "latest" and "${resolvedVersion}"; using "${resolvedVersion}".`,
        );
      } else if (
        specific.every((v, _, all) => all.every((other) => versionSpecsCompatible(v, other)))
      ) {
        // Ranges intersect but none is uniquely specific; do not silently choose.
        conflicts.push({
          name,
          versions: requestedVersions,
          requestedBy,
          message: `${name} has overlapping but different version requests (${requestedVersions.join(
            ", ",
          )}). Set an explicit version override to resolve.`,
        });
        continue;
      } else {
        conflicts.push({
          name,
          versions: requestedVersions,
          requestedBy,
          message: `${name} has incompatible version requests (${requestedVersions.join(
            ", ",
          )}) from ${requestedBy.join(", ")}. Set an explicit version override to resolve.`,
        });
        continue;
      }
    }

    const installed = input.installedPackages[name];
    if (installed !== undefined) {
      warnings.push(
        `${name} is already installed (${installed}); it will be updated to ${resolvedVersion}.`,
      );
    }

    packages.push({ name, requestedVersions, resolvedVersion, dependencyType, requestedBy });
  }

  packages.sort((a, b) => a.name.localeCompare(b.name));
  return { packages, conflicts, warnings };
}
