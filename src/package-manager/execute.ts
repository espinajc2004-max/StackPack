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
  const debug = process.env.STACKPACK_DEBUG === "1";
  if (debug)
    console.error(`[debug] spawning: ${cmd.command} ${cmd.args.join(" ")} (cwd=${cmd.cwd})`);
  const subprocess = execa(cmd.command, cmd.args, {
    cwd: cmd.cwd,
    stdio: cmd.interactive ? "inherit" : "pipe",
    reject: false,
  });
  if (debug) console.error(`[debug] spawned pid: ${subprocess.pid}`);
  const result = await subprocess;
  if (debug) console.error(`[debug] resolved exitCode: ${result.exitCode}`);
  return {
    exitCode: typeof result.exitCode === "number" ? result.exitCode : 1,
    stdout: typeof result.stdout === "string" ? result.stdout : "",
    stderr: typeof result.stderr === "string" ? result.stderr : "",
  };
};
