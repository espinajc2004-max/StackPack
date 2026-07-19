import { orBack, p } from "../ui/prompts.js";
import { parseVersionSpec } from "../utils/versions.js";
import { editablePackageNames, type SetupSelection } from "./state.js";

export async function runVersionEditor(selection: SetupSelection): Promise<void> {
  for (;;) {
    const names = editablePackageNames(selection);
    if (names.length === 0) {
      p.log.warn("Select integrations or custom packages first, then edit their versions.");
      return;
    }

    const choice = orBack(
      await p.select({
        message: "Choose a package to set a version for",
        options: [
          ...names.map((name) => ({
            value: name,
            label: name,
            hint: selection.versionOverrides[name] ?? "latest",
          })),
          { value: "__return__", label: "Return" },
        ],
      }),
    );
    if (choice === null || choice === "__return__") return;

    const input = orBack(
      await p.text({
        message: `Enter an npm version, range, or tag for ${choice} (Esc to go back)`,
        placeholder: "latest",
        initialValue: selection.versionOverrides[choice] ?? "",
        validate(value) {
          if (!value || value.trim().length === 0) return undefined;
          return parseVersionSpec(value) === null
            ? "Enter a valid npm version, range, or tag (e.g. 5, ^5.1.0, latest)."
            : undefined;
        },
      }),
    );

    if (input === null) continue;
    const trimmed = input.trim();
    const customPackage = selection.customPackages.find((pkg) => pkg.name === choice);
    if (trimmed.length === 0 || trimmed === "latest") {
      delete selection.versionOverrides[choice];
      if (customPackage) customPackage.version = "latest";
      p.log.success(`${choice} set to latest`);
    } else {
      selection.versionOverrides[choice] = trimmed;
      if (customPackage) customPackage.version = trimmed;
      p.log.success(`${choice} set to version ${trimmed}`);
    }
  }
}
