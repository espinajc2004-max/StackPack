#!/usr/bin/env node
// --no-color must be handled before any color-aware module is imported.
if (process.argv.includes("--no-color") || process.env.NO_COLOR) {
  process.env.NO_COLOR = "1";
  process.env.FORCE_COLOR = "0";
}

await import("./program.js");
