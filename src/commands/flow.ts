import type { ProjectContext } from "../schemas/project-context.js";
import type { SetupSelection } from "../dashboard/state.js";
import { runDashboard } from "../dashboard/main-dashboard.js";
import { reviewAndInstall, offerToSavePreset } from "./shared.js";
import type { CommandRunner } from "../package-manager/execute.js";

/**
 * Dashboard <-> review loop shared by new, add, and apply. The user can jump
 * back and forth until they install, finish a dry run, or cancel.
 */
export async function dashboardInstallLoop(params: {
  context: ProjectContext;
  selection: SetupSelection;
  dryRun: boolean;
  startAtReview?: boolean;
  runner?: CommandRunner;
}): Promise<"installed" | "dry-run" | "cancelled"> {
  let atReview = params.startAtReview === true;
  for (;;) {
    if (!atReview) {
      await runDashboard(params.context, params.selection);
    }
    const result = await reviewAndInstall({
      context: params.context,
      selection: params.selection,
      dryRun: params.dryRun,
      runner: params.runner,
      allowReturnToDashboard: true,
    });
    if (result === "back") {
      atReview = false;
      continue;
    }
    if (result === "installed") {
      await offerToSavePreset(params.context, params.selection);
      return "installed";
    }
    return result === "dry-run" ? "dry-run" : "cancelled";
  }
}
