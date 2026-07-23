import { orBack, p } from "../ui/prompts.js";
import { formatPackageSpecifier, parsePackageSpecifier } from "../utils/package-specifier.js";
import {
  forgetCustomPackage,
  loadConfig,
  rememberCustomPackages,
} from "../storage/config-store.js";
import type { CustomPackage, SetupSelection } from "./state.js";

export type AddCustomPackageResult =
  { ok: true; entry: CustomPackage } | { ok: false; reason: string };

/** Adds a validated npm package to the current setup without UI side effects. */
export function addCustomPackageToSelection(
  selection: SetupSelection,
  input: string,
  dependencyType: CustomPackage["dependencyType"],
): AddCustomPackageResult {
  const parsed = parsePackageSpecifier(input);
  if (!parsed.ok) return parsed;
  if (selection.customPackages.some((pkg) => pkg.name === parsed.value.name)) {
    return { ok: false, reason: `${parsed.value.name} is already in this setup.` };
  }
  const entry = { ...parsed.value, dependencyType };
  selection.customPackages.push(entry);
  return { ok: true, entry };
}

export async function runCustomPackagesCategory(selection: SetupSelection): Promise<void> {
  p.note(
    [
      "Use this for any npm package that is not listed in StackPack's integration categories.",
      "Accepted formats: package-name, package-name@version, or @scope/package@version.",
      "Packages added here appear in the review, install with the project, and are included when you save the setup as a preset.",
    ].join("\n\n"),
    "Add any npm package",
  );

  for (;;) {
    const config = await loadConfig();
    const saved = config.savedCustomPackages ?? [];
    const savedSelectable = saved.filter(
      (entry) => !selection.customPackages.some((pkg) => pkg.name === entry.name),
    );

    const action = orBack(
      await p.select({
        message: `Additional npm packages (${selection.customPackages.length} in this setup)`,
        options: [
          {
            value: "add",
            label: "Enter a package name",
            hint: "add a package that is not available in the categories",
          },
          ...(savedSelectable.length > 0
            ? [
                {
                  value: "saved",
                  label: "Choose from previously entered packages",
                  hint: `${savedSelectable.length} available on this device`,
                },
              ]
            : []),
          ...(selection.customPackages.length > 0
            ? [{ value: "remove", label: "Remove a package from this setup" }]
            : []),
          ...(saved.length > 0 ? [{ value: "manage", label: "Delete saved packages" }] : []),
          { value: "return", label: "Return to integrations" },
        ],
      }),
    );

    if (action === null || action === "return") return;

    if (action === "saved") {
      const chosen = orBack(
        await p.multiselect({
          message: "Select saved packages to add (space to toggle, enter to confirm)",
          required: false,
          options: savedSelectable.map((entry) => ({
            value: entry.name,
            label: formatPackageSpecifier(entry),
            hint: entry.dependencyType,
          })),
        }),
      );
      if (chosen === null) continue;
      for (const name of chosen) {
        const entry = savedSelectable.find((pkg) => pkg.name === name);
        if (entry) {
          selection.customPackages.push({ ...entry });
          p.log.success(`Added ${formatPackageSpecifier(entry)}`);
        }
      }
      continue;
    }

    if (action === "manage") {
      const chosen = orBack(
        await p.multiselect({
          message: "Delete which saved packages? (no project is changed)",
          required: false,
          options: saved.map((entry) => ({
            value: entry.name,
            label: formatPackageSpecifier(entry),
            hint: entry.dependencyType,
          })),
        }),
      );
      if (chosen === null) continue;
      for (const name of chosen) await forgetCustomPackage(name);
      if (chosen.length > 0) p.log.success(`Deleted ${chosen.length} saved package(s).`);
      continue;
    }

    if (action === "remove") {
      const name = orBack(
        await p.select({
          message: "Remove which package?",
          options: selection.customPackages.map((pkg) => ({
            value: pkg.name,
            label: formatPackageSpecifier(pkg),
            hint: pkg.dependencyType,
          })),
        }),
      );
      if (name === null) continue;
      selection.customPackages = selection.customPackages.filter((pkg) => pkg.name !== name);
      continue;
    }

    const input = orBack(
      await p.text({
        message: "Package to install (Esc to go back)",
        placeholder: "e.g. nanoid or lodash@^4.17.21",
        validate(value) {
          const result = parsePackageSpecifier(value ?? "");
          return result.ok ? undefined : result.reason;
        },
      }),
    );
    if (input === null) continue;
    const parsed = parsePackageSpecifier(input);
    if (!parsed.ok) continue;

    const dependencyType = orBack(
      await p.select({
        message: "Add package as",
        options: [
          {
            value: "dependency",
            label: "Runtime dependency",
            hint: "saved under dependencies; available to application code",
          },
          {
            value: "devDependency",
            label: "Development dependency",
            hint: "saved under devDependencies; for build, test, or tooling",
          },
        ],
      }),
    ) as "dependency" | "devDependency" | null;
    if (dependencyType === null) continue;

    p.note(
      [
        "Installation: package only; no configuration files will be generated.",
        "Current setup: included in the final review and installation.",
        "Saved preset: included automatically if you save this setup after installation.",
      ].join("\n"),
      formatPackageSpecifier(parsed.value),
    );

    const added = addCustomPackageToSelection(selection, input, dependencyType);
    if (!added.ok) {
      p.log.warn(added.reason);
      continue;
    }
    await rememberCustomPackages([added.entry]);
    p.log.success(
      `Added ${formatPackageSpecifier(added.entry)} to this setup. It will also be available as a suggestion next time.`,
    );
  }
}
