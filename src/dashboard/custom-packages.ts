import { guard, p } from "../ui/prompts.js";
import { formatPackageSpecifier, parsePackageSpecifier } from "../utils/package-specifier.js";
import type { SetupSelection } from "./state.js";

export async function runCustomPackagesCategory(selection: SetupSelection): Promise<void> {
  for (;;) {
    const action = guard(
      await p.select({
        message: `Custom packages (${selection.customPackages.length} added)`,
        options: [
          { value: "add", label: "Add an npm package" },
          ...(selection.customPackages.length > 0
            ? [{ value: "remove", label: "Remove a package" }]
            : []),
          { value: "return", label: "Return to integrations" },
        ],
      }),
    );

    if (action === "return") return;

    if (action === "remove") {
      const name = guard(
        await p.select({
          message: "Remove which package?",
          options: selection.customPackages.map((pkg) => ({
            value: pkg.name,
            label: formatPackageSpecifier(pkg),
            hint: pkg.dependencyType,
          })),
        }),
      );
      selection.customPackages = selection.customPackages.filter((pkg) => pkg.name !== name);
      continue;
    }

    const input = guard(
      await p.text({
        message: "Enter an npm package (name or name@version)",
        placeholder: "sonner@latest",
        validate(value) {
          const result = parsePackageSpecifier(value ?? "");
          return result.ok ? undefined : result.reason;
        },
      }),
    );
    const parsed = parsePackageSpecifier(input);
    if (!parsed.ok) continue;

    if (selection.customPackages.some((pkg) => pkg.name === parsed.value.name)) {
      p.log.warn(`${parsed.value.name} is already in the custom package list.`);
      continue;
    }

    const dependencyType = guard(
      await p.select({
        message: "Add package as",
        options: [
          { value: "dependency", label: "dependency" },
          { value: "devDependency", label: "devDependency" },
        ],
      }),
    ) as "dependency" | "devDependency";

    p.note(
      "StackPack does not have a verified automatic recipe for this package.\nIt will be installed only. No configuration files will be generated.",
      formatPackageSpecifier(parsed.value),
    );

    selection.customPackages.push({ ...parsed.value, dependencyType });
    p.log.success(`Added ${formatPackageSpecifier(parsed.value)}`);
  }
}
