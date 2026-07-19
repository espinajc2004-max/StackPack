export class StackPackError extends Error {
  readonly hints: string[];

  constructor(message: string, options?: { hints?: string[]; cause?: unknown }) {
    super(message, { cause: options?.cause });
    this.name = "StackPackError";
    this.hints = options?.hints ?? [];
  }
}

export class CancelledError extends Error {
  constructor(message = "Operation cancelled.") {
    super(message);
    this.name = "CancelledError";
  }
}

export function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
