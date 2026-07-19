import { Command, Option } from "commander";
import { guard, p } from "./ui/prompts.js";
import { printError } from "./ui/errors.js";
import { runNew } from "./commands/new.js";
import { runAdd } from "./commands/add.js";
import { runScan } from "./commands/scan.js";
import { runSave } from "./commands/save.js";
import { runApply } from "./commands/apply.js";
import { runPresetsDelete, runPresetsList, runPresetsShow } from "./commands/presets.js";
import { VERSION } from "./version.js";
import type { PackageManager } from "./package-manager/types.js";

const packageManagerOption = new Option(
  "--package-manager <manager>",
  "package manager to use",
).choices(["npm", "pnpm", "yarn", "bun"]);

async function runMainMenu(): Promise<void> {
  p.intro("StackPack");
  p.log.message("Official project tooling with real-world integrations.");
  p.log.message("Presets stay on this device.");

  const choice = guard(
    await p.select({
      message: "What would you like to do?",
      options: [
        { value: "new", label: "Create a new project" },
        { value: "add", label: "Add integrations to the current project" },
        { value: "scan", label: "Scan the current project" },
        { value: "presets", label: "View saved presets" },
        { value: "exit", label: "Exit" },
      ],
    }),
  );

  switch (choice) {
    case "new":
      await runNew(undefined, {});
      return;
    case "add":
      await runAdd({});
      return;
    case "scan":
      await runScan();
      return;
    case "presets":
      await runPresetsList();
      return;
    default:
      p.outro("Goodbye.");
  }
}

export async function runCli(argv: string[]): Promise<void> {
  const program = new Command();
  program
    .name("stackpack")
    .description(
      "Local-first terminal integration builder. Official project tooling with real-world integrations; presets stay on this device.",
    )
    .version(VERSION)
    .option("--no-color", "disable colored output");

  program
    .command("new")
    .description("Create a new project with an official creator, then add integrations")
    .argument("[project-name]", "name of the project folder to create")
    .option("--preset <name>", "create the project from a saved preset")
    .addOption(packageManagerOption)
    .action(
      async (
        projectName: string | undefined,
        options: { preset?: string; packageManager?: PackageManager },
      ) => {
        await runNew(projectName, options);
      },
    );

  program
    .command("add")
    .description("Add integrations to the current project")
    .option("--dry-run", "show the full plan without changing anything")
    .addOption(packageManagerOption)
    .action(async (options: { dryRun?: boolean; packageManager?: PackageManager }) => {
      await runAdd(options);
    });

  program
    .command("scan")
    .description("Detect the current project's stack and installed integrations")
    .action(async () => {
      await runScan();
    });

  program
    .command("save")
    .description("Save the current project's detected setup as a preset")
    .argument("<preset-name>", "name for the preset")
    .option("--local", "store the preset inside this project (.stackpack/)")
    .option("--global", "store the preset in your home directory (default)")
    .action(async (name: string, options: { local?: boolean; global?: boolean }) => {
      await runSave(name, options);
    });

  program
    .command("apply")
    .description("Apply a saved preset's integrations to the current project")
    .argument("<preset-name>", "preset to apply")
    .option("--dry-run", "show the full plan without changing anything")
    .action(async (name: string, options: { dryRun?: boolean }) => {
      await runApply(name, options);
    });

  const presets = program.command("presets").description("Manage saved presets");
  presets
    .command("list")
    .description("List saved presets (global and project-local)")
    .action(async () => {
      await runPresetsList();
    });
  presets
    .command("show")
    .description("Show a preset's contents")
    .argument("<preset-name>")
    .action(async (name: string) => {
      await runPresetsShow(name);
    });
  presets
    .command("delete")
    .description("Delete a saved preset")
    .argument("<preset-name>")
    .action(async (name: string) => {
      await runPresetsDelete(name);
    });

  const hasCommand = argv.slice(2).some((arg) => !arg.startsWith("-"));
  const onlyFlags = argv.slice(2).every((arg) => arg === "--no-color");

  try {
    if (!hasCommand && onlyFlags) {
      await runMainMenu();
      return;
    }
    await program.parseAsync(argv);
  } catch (error) {
    process.exitCode = printError(error);
  }
}
