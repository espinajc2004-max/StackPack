import { guard, p } from "../ui/prompts.js";
import { detectProject } from "../engine/detect-project.js";
import { getGitInfo } from "../project/git-status.js";
import { describeContext } from "../ui/messages.js";
import { createEmptySelection } from "../dashboard/state.js";
import { dashboardInstallLoop } from "./flow.js";
import { StackPackError, CancelledError } from "../utils/errors.js";
import type { PackageManager } from "../package-manager/types.js";
import type { ProjectContext } from "../schemas/project-context.js";

export async function resolveContextWithPackageManager(
  cwd: string,
  packageManagerOverride?: PackageManager,
): Promise<ProjectContext> {
  let context = await detectProject(cwd, { packageManagerOverride });
  if (context.detection === "ambiguous" && context.packageManagerCandidates.length > 1) {
    p.log.warn(
      `Multiple lockfiles detected: the project matches ${context.packageManagerCandidates.join(
        ", ",
      )}. The other lockfiles will not be modified or deleted.`,
    );
    const chosen = guard(
      await p.select({
        message: "Choose a package manager",
        options: context.packageManagerCandidates.map((pm) => ({ value: pm, label: pm })),
      }),
    ) as PackageManager;
    context = await detectProject(cwd, { packageManagerOverride: chosen });
  }
  return context;
}

export async function runAdd(options: {
  dryRun?: boolean;
  packageManager?: PackageManager;
  cwd?: string;
}): Promise<void> {
  const cwd = options.cwd ?? process.cwd();
  p.intro("StackPack — add integrations");

  const context = await resolveContextWithPackageManager(cwd, options.packageManager);
  if (context.detection === "unsupported") {
    throw new StackPackError("This project is not a supported React or Next.js project.", {
      hints: [
        "StackPack currently supports React with Vite and Next.js projects.",
        `Detected directory: ${context.rootDirectory}`,
      ],
    });
  }
  if (context.detection === "partially-detected") {
    p.log.warn("The project was only partially detected; some integrations may be hidden.");
  }

  p.note(describeContext(context), "Existing project detected");
  const proceed = guard(
    await p.confirm({ message: "Continue to the integration dashboard?", initialValue: true }),
  );
  if (!proceed) throw new CancelledError();

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

  const selection = createEmptySelection();
  const outcome = await dashboardInstallLoop({
    context,
    selection,
    dryRun: options.dryRun === true,
  });
  if (outcome === "cancelled") throw new CancelledError();
  p.outro(outcome === "dry-run" ? "Dry run finished." : "Integrations installed.");
}
