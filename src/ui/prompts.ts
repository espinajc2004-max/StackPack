import * as p from "@clack/prompts";
import { CancelledError } from "../utils/errors.js";

/** Unwraps a Clack prompt result, converting cancellation into a typed error. */
export function guard<T>(value: T | symbol): T {
  if (p.isCancel(value)) {
    throw new CancelledError();
  }
  return value as T;
}

export { p };
