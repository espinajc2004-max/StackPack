#!/usr/bin/env node
if (process.argv.includes("--no-color")) {
  process.env.NO_COLOR = "1";
}

const { runCli } = await import("./program.js");
await runCli(process.argv);
