import { orBack, p } from "../ui/prompts.js";
import { formatPackageSpecifier, parsePackageSpecifier } from "../utils/package-specifier.js";
import {
  forgetCustomPackage,
  loadConfig,
  rememberCustomPackages,
} from "../storage/config-store.js";
import type { SetupSelection } from "./state.js";

export async function runCustomPackagesCategory(selection: SetupSelection): Promise<void> {
  for (;;) {
    const config = await loadConfig();
    const saved = config.savedCustomPackages ?? [];
    const savedSelectable = saved.filter(
      (entry) => !selection.customPackages.some((pkg) => pkg.name === entry.name),
    );

    const action = orBack(
      await p.select({
        message: `Custom packages (${selection.customPackages.length} added)`,
        options: [
          {
            value: "add",
            label: "Add an npm package",
            hint: "typed packages are saved for future setups",
          },
          ...(savedSelectable.length > 0
            ? [
                {
                  value: "saved",
                  label: "Add from saved packages",
                  hint: `${savedSelectable.length} saved earlier`,
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
        message: "Enter an npm package (name or name@version, Esc to go back)",
        placeholder: "sonner@latest",
        validate(value) {
          const result = parsePackageSpecifier(value ?? "");
          return result.ok ? undefined : result.reason;
        },
      }),
    );
    if (input === null) continue;
    const parsed = parsePackageSpecifier(input);
    if (!parsed.ok) continue;

    if (selection.customPackages.some((pkg) => pkg.name === parsed.value.name)) {
      p.log.warn(`${parsed.value.name} is already in the custom package list.`);
      continue;
    }

    const dependencyType = orBack(
      await p.select({
        message: "Add package as",
        options: [
          { value: "dependency", label: "dependency" },
          { value: "devDependency", label: "devDependency" },
        ],
      }),
    ) as "dependency" | "devDependency" | null;
    if (dependencyType === null) continue;

    p.note(
      "StackPack does not have a verified automatic recipe for this package.\nIt will be installed only. No configuration files will be generated.",
      formatPackageSpecifier(parsed.value),
    );

    const entry = { ...parsed.value, dependencyType };
    selection.customPackages.push(entry);
    await rememberCustomPackages([entry]);
    p.log.success(`Added ${formatPackageSpecifier(parsed.value)} — saved for future setups too.`);
  }
}
