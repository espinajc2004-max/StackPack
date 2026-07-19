import pc from "picocolors";
import { CancelledError, StackPackError, toErrorMessage } from "../utils/errors.js";

/**
 * Prints an actionable error. Returns the exit code the process should use.
 */
export function printError(error: unknown, options: { changesApplied?: boolean } = {}): number {
  if (error instanceof CancelledError) {
    console.log("");
    console.log("Operation cancelled.");
    console.log(
      options.changesApplied
        ? "Some changes may have been applied before cancellation. Check .stackpack/backups for backups."
        : "No project files were changed.",
    );
    return 0;
  }
  console.error("");
  console.error(pc.red(`✗ ${toErrorMessage(error)}`));
  if (error instanceof StackPackError) {
    for (const hint of error.hints) {
      console.error(`  ${hint}`);
    }
  }
  return 1;
}
