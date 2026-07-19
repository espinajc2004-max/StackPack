import { execa } from "execa";

export type GitInfo = {
  isRepository: boolean;
  hasUncommittedChanges: boolean;
};

/** Git is optional; any failure simply reports "not a repository". */
export async function getGitInfo(projectRoot: string): Promise<GitInfo> {
  try {
    const inside = await execa("git", ["rev-parse", "--is-inside-work-tree"], {
      cwd: projectRoot,
      reject: false,
    });
    if (inside.exitCode !== 0 || String(inside.stdout).trim() !== "true") {
      return { isRepository: false, hasUncommittedChanges: false };
    }
    const status = await execa("git", ["status", "--porcelain"], {
      cwd: projectRoot,
      reject: false,
    });
    return {
      isRepository: true,
      hasUncommittedChanges: status.exitCode === 0 && String(status.stdout).trim().length > 0,
    };
  } catch {
    return { isRepository: false, hasUncommittedChanges: false };
  }
}
