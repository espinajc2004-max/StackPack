import pc from "picocolors";

const ART = [
  "███████╗████████╗ █████╗  ██████╗██╗  ██╗██████╗  █████╗  ██████╗██╗  ██╗",
  "██╔════╝╚══██╔══╝██╔══██╗██╔════╝██║ ██╔╝██╔══██╗██╔══██╗██╔════╝██║ ██╔╝",
  "███████╗   ██║   ███████║██║     █████╔╝ ██████╔╝███████║██║     █████╔╝ ",
  "╚════██║   ██║   ██╔══██║██║     ██╔═██╗ ██╔═══╝ ██╔══██║██║     ██╔═██╗ ",
  "███████║   ██║   ██║  ██║╚██████╗██║  ██╗██║     ██║  ██║╚██████╗██║  ██╗",
  "╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝╚═╝     ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝",
];

const LINE_COLORS = [pc.cyan, pc.cyan, pc.blue, pc.blue, pc.magenta, pc.magenta];

const TAGLINE = "Build your stack once. Reuse it anywhere.";

const DESCRIPTION = [
  "StackPack is a local-first stack recipe engine for JavaScript & TypeScript.",
  "Create a stack interactively, save it as a preset, and install it into any",
  "project with one command — packages, config files, and scripts included.",
  "No account. No cloud. Your presets never leave your machine.",
];

export function renderBanner(): string {
  const width = process.stdout.columns ?? 80;
  const art =
    width >= ART[0].length + 2
      ? ART.map((line, i) => LINE_COLORS[i](line)).join("\n")
      : pc.bold(pc.cyan("⚡ StackPack"));

  return [
    "",
    art,
    "",
    `  ${pc.bold(TAGLINE)}`,
    "",
    ...DESCRIPTION.map((line) => `  ${pc.dim(line)}`),
    "",
  ].join("\n");
}
