import { execa } from "execa";
import type { CommandDefinition } from "./types.js";

export type CommandResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

export type CommandRunner = (cmd: CommandDefinition) => Promise<CommandResult>;

/**
 * Runs a command with execa. The executable and arguments are always passed
 * separately; no shell is used. Interactive commands inherit stdio so
 * official tools can show their own prompts.
 */
export const realCommandRunner: CommandRunner = async (cmd) => {
  const result = await execa(cmd.command, cmd.args, {
    cwd: cmd.cwd,
    stdio: cmd.interactive ? "inherit" : "pipe",
    reject: false,
  });
  return {
    exitCode: typeof result.exitCode === "number" ? result.exitCode : 1,
    stdout: typeof result.stdout === "string" ? result.stdout : "",
    stderr: typeof result.stderr === "string" ? result.stderr : "",
  };
};
