export type PackageManager = "npm" | "pnpm" | "yarn" | "bun";

export type CommandDefinition = {
  command: string;
  args: string[];
  cwd?: string;
  /** Interactive commands inherit stdio so official prompts can appear. */
  interactive?: boolean;
};

export function formatCommand(cmd: CommandDefinition): string {
  return [cmd.command, ...cmd.args].join(" ");
}
