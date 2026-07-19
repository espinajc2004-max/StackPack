#!/usr/bin/env node
if (process.argv.includes("--no-color")) {
  process.env.NO_COLOR = "1";
}

const { runCli } = await import("./program.js");
await runCli(process.argv);
// Interactive prompts keep stdin referenced; exit explicitly once work is done.
process.exit(process.exitCode ?? 0);
