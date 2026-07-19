import { guard, p } from "../ui/prompts.js";
import { loadPreset } from "../storage/preset-store.js";
import { getGitInfo } from "../project/git-status.js";
import { presetToSelection } from "./selection-utils.js";
import { dashboardInstallLoop } from "./flow.js";
import { resolveContextWithPackageManager } from "./add.js";
import { CancelledError, StackPackError } from "../utils/errors.js";
import { describeContext } from "../ui/messages.js";

/** Applies a saved preset's integrations to the current project. */
export async function runApply(
  name: string,
  options: { dryRun?: boolean; cwd?: string },
): Promise<void> {
  const cwd = options.cwd ?? process.cwd();
  p.intro("StackPack — apply preset");

  const { preset, location } = await loadPreset(name, { projectRoot: cwd });
  p.log.info(`Using ${location.scope} preset: ${location.filePath}`);

  const context = await resolveContextWithPackageManager(cwd);
  if (context.detection === "unsupported") {
    throw new StackPackError("This project is not a supported React or Next.js project.");
  }
  p.note(describeContext(context), "Existing project detected");

  const mismatches: string[] = [];
  if (preset.project.framework !== context.framework) {
    mismatches.push(
      `framework (preset: ${preset.project.framework}, project: ${context.framework})`,
    );
  }
  if (preset.project.buildTool !== context.buildTool) {
    mismatches.push(
      `build tool (preset: ${preset.project.buildTool}, project: ${context.buildTool})`,
    );
  }
  if (mismatches.length > 0) {
    throw new StackPackError(`Preset "${name}" does not match this project.`, {
      hints: mismatches.map((m) => `Mismatched ${m}`),
    });
  }

  if (!options.dryRun) {
    const git = await getGitInfo(context.rootDirectory);
    if (git.isRepository && git.hasUncommittedChanges) {
      const goOn = guard(
        await p.confirm({
          message:
            "Uncommitted Git changes detected. StackPack will create its own backup, but committing first is safer. Continue?",
          initialValue: true,
        }),
      );
      if (!goOn) throw new CancelledError();
    }
  }

  const selection = presetToSelection(preset);
  const outcome = await dashboardInstallLoop({
    context,
    selection,
    dryRun: options.dryRun === true,
    startAtReview: true,
  });
  if (outcome === "cancelled") throw new CancelledError();
  p.outro(outcome === "dry-run" ? "Dry run finished." : `Preset "${name}" applied.`);
}
