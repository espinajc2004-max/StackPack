import * as p from "@clack/prompts";
import { CancelledError } from "../utils/errors.js";

/** Unwraps a Clack prompt result, converting cancellation into a typed error. */
export function guard<T>(value: T | symbol): T {
  if (p.isCancel(value)) {
    throw new CancelledError();
  }
  return value as T;
}

/**
 * Unwraps a Clack prompt result, returning null on cancel (Esc) so callers
 * can treat it as "go back one level" instead of aborting the whole flow.
 */
export function orBack<T>(value: T | symbol): T | null {
  if (p.isCancel(value)) return null;
  return value as T;
}

export { p };
