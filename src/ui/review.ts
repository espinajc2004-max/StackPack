import pc from "picocolors";
import type { InstallationPlan } from "../engine/build-plan.js";
import { buildToolLabel, frameworkLabel, languageLabel } from "./messages.js";

function section(title: string, lines: string[]): string[] {
  if (lines.length === 0) return [];
  return ["", pc.bold(title), ...lines.map((line) => `  ${line}`)];
}

/** Renders the full installation plan for the review screen. */
export function renderPlanReview(plan: InstallationPlan): string {
  const lines: string[] = [];

  lines.push(pc.bold("Base project"));
  lines.push(`  ${frameworkLabel(plan.context)} with ${buildToolLabel(plan.context)}`);
  lines.push(`  ${languageLabel(plan.context)}`);
  lines.push(`  ${plan.context.packageManager}`);

  const integrationLines = plan.integrations.map(({ recipe, options }) => {
    const detail = recipe.describeOptions?.(options);
    return detail ? `${recipe.name} (${detail})` : recipe.name;
  });
  lines.push(...section("Selected integrations", integrationLines));

  lines.push(
    ...section(
      "Dependencies",
      plan.dependencies.map(
        (dep) =>
          `${pc.green("+")} ${dep.name}@${dep.resolvedVersion} ${pc.dim(`(${dep.requestedBy.join(", ")})`)}`,
      ),
    ),
  );
  lines.push(
    ...section(
      "Development dependencies",
      plan.devDependencies.map(
        (dep) =>
          `${pc.green("+")} ${dep.name}@${dep.resolvedVersion} ${pc.dim(`(${dep.requestedBy.join(", ")})`)}`,
      ),
    ),
  );

  lines.push(
    ...section(
      "Official initializers (delegated changes)",
      plan.initializers.map((entry) => `${entry.name} — ${entry.initializer.description}`),
    ),
  );

  lines.push(
    ...section(
      "Files StackPack plans to create",
      plan.filesToCreate.map((file) => `${pc.green("+")} ${file.path}`),
    ),
  );
  lines.push(
    ...section(
      "Files StackPack plans to modify",
      plan.filesToModify.map((file) => `${pc.yellow("~")} ${file}`),
    ),
  );
  lines.push(
    ...section(
      "Scripts",
      plan.scripts.map((script) => `${script.name}: ${script.command}`),
    ),
  );

  lines.push(
    ...section(
      "Existing files that conflict",
      plan.existingFileConflicts.map((file) => `${pc.yellow("⚠")} ${file} already exists`),
    ),
  );
  lines.push(
    ...section(
      "Script conflicts",
      plan.scriptConflicts.map(
        (conflict) =>
          `${pc.yellow("⚠")} "${conflict.name}" exists (current: ${conflict.current}, proposed: ${conflict.proposed})`,
      ),
    ),
  );
  lines.push(
    ...section(
      "Unresolved version conflicts",
      plan.conflicts.map((conflict) => `${pc.red("✗")} ${conflict.message}`),
    ),
  );
  lines.push(
    ...section(
      "Warnings",
      plan.warnings.map((warning) => `${pc.yellow("⚠")} ${warning}`),
    ),
  );

  if (plan.initializers.length > 0) {
    lines.push("");
    lines.push(
      pc.dim(
        "StackPack lists its own exact changes above; official initializers control their own additional changes.",
      ),
    );
  }

  return lines.join("\n");
}
