import pc from "picocolors";
import { p } from "../ui/prompts.js";
import { detectProject } from "../engine/detect-project.js";
import { filterIntegrations } from "../engine/filter-integrations.js";
import { allRecipes } from "../integrations/registry.js";
import { describeContext } from "../ui/messages.js";

export async function runScan(options: { cwd?: string } = {}): Promise<void> {
  const cwd = options.cwd ?? process.cwd();
  p.intro("StackPack — scan");

  const context = await detectProject(cwd);
  p.note(describeContext(context), "Project detection");

  if (context.packageManagerCandidates.length > 1) {
    p.log.warn(`Multiple lockfiles detected (${context.packageManagerCandidates.join(", ")}).`);
  }

  const availabilities = filterIntegrations(context, allRecipes);
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
  p.outro(`Detection state: ${context.detection}`);
}
