import * as p from "@clack/prompts";
import { renderError } from "../utils/errors.js";

/** Unwraps a clack prompt result, exiting cleanly on cancel (Escape/Ctrl+C). */
export function must<T>(value: T | symbol): T {
  if (p.isCancel(value)) {
    p.cancel("Cancelled.");
    process.exit(0);
  }
  return value as T;
}

export function fail(err: unknown): never {
  console.error("\n" + renderError(err));
  process.exit(1);
}

export async function runCommand(fn: () => Promise<void> | void): Promise<void> {
  try {
    await fn();
  } catch (err) {
    fail(err);
  }
}
