export const SYM = {
  ok: "✓",
  warn: "⚠",
  err: "✗",
} as const;

export class StackPackError extends Error {
  constructor(
    message: string,
    public hint?: string
  ) {
    super(message);
    this.name = "StackPackError";
  }
}

export function renderError(err: unknown): string {
  if (err instanceof StackPackError) {
    return `${SYM.err} ${err.message}${err.hint ? `\n\n${err.hint}` : ""}`;
  }
  if (err instanceof Error) return `${SYM.err} ${err.message}`;
  return `${SYM.err} ${String(err)}`;
}
