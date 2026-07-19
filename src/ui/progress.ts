import { p } from "./prompts.js";

/** Runs an async task behind a Clack spinner with honest failure output. */
export async function withSpinner<T>(
  startMessage: string,
  doneMessage: string,
  task: () => Promise<T>,
): Promise<T> {
  const spinner = p.spinner();
  spinner.start(startMessage);
  try {
    const result = await task();
    spinner.stop(doneMessage);
    return result;
  } catch (error) {
    spinner.stop(`${startMessage} failed`);
    throw error;
  }
}
