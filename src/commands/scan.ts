import pc from "picocolors";
import { p } from "../ui/prompts.js";
import { detectProject } from "../engine/detect-project.js";
import { describeContext } from "../ui/messages.js";
import { selectedRecipes } from "../dashboard/state.js";
import { scanProjectForPreset } from "./save.js";

export async function runScan(options: { cwd?: string } = {}): Promise<void> {
  const cwd = options.cwd ?? process.cwd();
  p.intro("StackPack — scan");

  const context = await detectProject(cwd);
  p.note(describeContext(context), "Project detection");

  if (context.packageManagerCandidates.length > 1) {
    p.log.warn(`Multiple lockfiles detected (${context.packageManagerCandidates.join(", ")}).`);
  }

  const scan = scanProjectForPreset(context);
  const availabilities = scan.availabilities;
  const lines = availabilities.map((availability) => {
    switch (availability.compatibility) {
      case "already-installed":
        return `${pc.green("●")} ${availability.recipe.name} — ${availability.reason}`;
      case "partially-configured":
        return `${pc.yellow("◐")} ${availability.recipe.name} — ${availability.reason ?? "partially configured"}`;
      case "incompatible":
        return `${pc.dim("○")} ${pc.dim(`${availability.recipe.name} — ${availability.reason}`)}`;
      default:
        return `${pc.dim("○")} ${availability.recipe.name} — not installed`;
    }
  });
  p.note(lines.join("\n"), "Known integrations");

  const represented = selectedRecipes(scan.selection).map(({ recipe }) => recipe.name);
  const preservedVersions = Object.keys(scan.selection.versionOverrides).length;
  p.note(
    [
      `Recognized integrations\n  ${represented.length > 0 ? represented.join(", ") : "(none)"}`,
      `Other portable packages\n  ${scan.selection.customPackages.length}`,
      `Integration versions preserved\n  ${preservedVersions}`,
      `Packages skipped as non-portable\n  ${scan.skippedPackages.length}`,
    ].join("\n\n"),
    "Preset-ready scan",
  );
  if (scan.categoryCollisions.length > 0) {
    p.log.warn(
      `Saved as custom packages because their dashboard category is already occupied: ${scan.categoryCollisions.join(", ")}.`,
    );
  }
  for (const skipped of scan.skippedPackages) {
    p.log.warn(`Cannot store ${skipped.name}@${skipped.version}: ${skipped.reason}`);
  }
  p.outro(`Detection state: ${context.detection}`);
}
