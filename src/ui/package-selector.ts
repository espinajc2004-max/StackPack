import * as p from "@clack/prompts";
import {
  formatPackage,
  isValidPackageName,
  isValidVersionInput,
  parsePackageInput,
} from "../utils/package-parser.js";
import { suggestClosest } from "../utils/suggest.js";
import { verifyPackage, verifyVersion } from "../registry/verify.js";
import { curatedExtras, getRecipe } from "../recipes/registry.js";
import { SYM } from "../utils/errors.js";
import { must } from "./prompts.js";

export interface SelectedPackages {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

/** Curated extra packages via a grouped multiselect. */
export async function selectCuratedExtras(): Promise<string[]> {
  const groups: Record<string, Array<{ value: string; label: string; hint?: string }>> =
    {};
  for (const { group, packages } of curatedExtras) {
    groups[group] = packages.map((pkg) => ({
      value: pkg.name,
      label: pkg.name,
      hint: pkg.hint,
    }));
  }
  const selection = must(
    await p.groupMultiselect({
      message: "Select additional packages (Space to select, Enter to continue)",
      options: groups,
      required: false,
    })
  );
  return selection as string[];
}

/** Custom npm package input loop: "@tanstack/react-query@5" etc. */
export async function addCustomPackages(
  selected: SelectedPackages
): Promise<void> {
  const wantCustom = must(
    await p.confirm({
      message: "Add custom npm packages?",
      initialValue: false,
    })
  );
  if (!wantCustom) return;

  p.log.info(
    "Packages are added at their latest version.\nYou can change any version in the next step, before the final review."
  );

  for (;;) {
    const raw = must(
      await p.text({
        message: "Add an npm package (leave empty to finish)",
        placeholder: "@tanstack/react-query",
        defaultValue: "",
      })
    ).trim();
    if (!raw) break;

    const { name, version } = parsePackageInput(raw);
    if (!isValidPackageName(name)) {
      p.log.error(`${SYM.err} "${name}" is not a valid npm package name`);
      continue;
    }
    if (!isValidVersionInput(version)) {
      p.log.error(`${SYM.err} "${version}" is not a valid version`);
      continue;
    }

    const spin = p.spinner();
    spin.start("Checking npm registry");
    const pkgStatus = await verifyPackage(name);
    const versionStatus =
      pkgStatus === "found" ? await verifyVersion(name, version) : "unchecked";
    spin.stop("Checked npm registry");

    if (pkgStatus === "missing") {
      const knownNames = curatedKnownNames();
      const suggestion = suggestClosest(name, knownNames);
      p.log.error(
        `${SYM.err} Package could not be verified\n\nPackage:\n${name}` +
          (suggestion ? `\n\nPossible match:\n${suggestion}` : "")
      );
      continue;
    }
    if (pkgStatus === "unreachable") {
      p.log.warn(`${SYM.warn} Registry unreachable — adding ${name} unverified.`);
    } else {
      p.log.success(`${SYM.ok} Package found`);
      if (versionStatus === "found") p.log.success(`${SYM.ok} Version is available`);
      if (versionStatus === "missing") {
        p.log.error(`${SYM.err} Version ${version} does not exist for ${name}`);
        continue;
      }
    }

    const shown = version === "latest" ? name : formatPackage(name, version);
    const target = must(
      await p.select({
        message: `Add ${shown} as:`,
        options: [
          { value: "dependency", label: "dependency" },
          { value: "devDependency", label: "devDependency" },
        ],
      })
    );

    if (!getRecipe(name)) {
      p.log.info(
        "StackPack does not have an automatic setup recipe for this package.\nIt will be installed only. No configuration files will be generated."
      );
    }

    if (target === "dependency") selected.dependencies[name] = version;
    else selected.devDependencies[name] = version;
    p.log.success(`${SYM.ok} Added ${shown} (${target})`);
  }
}

function curatedKnownNames(): string[] {
  const names = new Set<string>();
  for (const { packages } of curatedExtras) {
    for (const pkg of packages) names.add(pkg.name);
  }
  for (const known of [
    "react",
    "react-dom",
    "react-router-dom",
    "@tanstack/react-router",
    "@tanstack/react-query",
    "@reduxjs/toolkit",
    "react-hook-form",
    "zustand",
    "jotai",
    "swr",
    "axios",
    "zod",
    "yup",
    "vitest",
    "jest",
    "express",
    "typescript",
  ]) {
    names.add(known);
  }
  return [...names];
}

/** Version editing loop — the prompt-based equivalent of the "V" keybinding. */
export async function editVersions(selected: SelectedPackages): Promise<void> {
  const total =
    Object.keys(selected.dependencies).length +
    Object.keys(selected.devDependencies).length;
  if (total === 0) return;

  p.log.info(
    `All ${total} packages will install their latest version by default.`
  );
  const wantVersions = must(
    await p.confirm({
      message: "Do you want to pin specific versions for any packages?",
      initialValue: false,
    })
  );
  if (!wantVersions) return;

  for (;;) {
    const entries = [
      ...Object.entries(selected.dependencies).map(
        ([n, v]) => [n, v, "dependencies"] as const
      ),
      ...Object.entries(selected.devDependencies).map(
        ([n, v]) => [n, v, "devDependencies"] as const
      ),
    ];
    if (entries.length === 0) return;

    const choice = must(
      await p.select({
        message: "Set a package version? (current versions shown)",
        options: [
          { value: "__done__", label: "Done — keep versions as shown" },
          ...entries.map(([name, version, kind]) => ({
            value: `${kind}:${name}`,
            label: `${name}  ${version}`,
            hint: kind === "devDependencies" ? "dev" : undefined,
          })),
        ],
      })
    );
    if (choice === "__done__") return;

    const [kind, ...nameParts] = choice.split(":");
    const name = nameParts.join(":");
    const version = must(
      await p.text({
        message: `Set version for ${name}`,
        placeholder: "18.3.1, ^18, latest, next…",
        validate: (v) =>
          !v || isValidVersionInput(v.trim()) ? undefined : "Not a valid version",
        defaultValue: "latest",
      })
    ).trim();

    const record =
      kind === "dependencies" ? selected.dependencies : selected.devDependencies;
    record[name] = version || "latest";
    p.log.success(
      `${SYM.ok} Updated ${name} to ${formatPackage(name, record[name])}`
    );
  }
}
