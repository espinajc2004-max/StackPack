import { Command, Option } from "commander";
import pc from "picocolors";
import { p } from "./ui/prompts.js";
import { printError } from "./ui/errors.js";
import { runExpressInstall, runNew } from "./commands/new.js";
import { runAdd } from "./commands/add.js";
import { runScan } from "./commands/scan.js";
import { runSave, runSaveInteractive } from "./commands/save.js";
import { runApply } from "./commands/apply.js";
import {
  runPresetsBrowser,
  runPresetsDelete,
  runPresetsEdit,
  runPresetsList,
  runPresetsShow,
} from "./commands/presets.js";
import { CancelledError, StackPackError } from "./utils/errors.js";
import { getUpdateNotice } from "./utils/update-check.js";
import { VERSION } from "./version.js";
import type { PackageManager } from "./package-manager/types.js";

export const CLI_HELP_EPILOG = `
Common workflows:
  stackpack
      Open the interactive menu.
  stackpack new my-app
      Create a project with an official creator, then choose integrations.
  stackpack new my-app --preset my-stack
      Create a project and start with a saved preset.
  stackpack install my-stack my-app
      Create and configure a project from a preset in one express flow.
  stackpack add
      Add integrations to the project in the current directory.
  stackpack add --dry-run
      Review commands and files without changing the project.
  stackpack scan
      Show the detected framework, packages, and known integrations.
  stackpack save my-stack --local
      Save a project-local preset after choosing portable packages.
  stackpack save my-stack --all-packages
      Save every portable dependency without the package picker.
  stackpack apply my-stack --dry-run
      Preview a preset against the current project before installing.

Preset management:
  stackpack presets list
  stackpack presets show my-stack
  stackpack presets edit my-stack
  stackpack presets delete my-stack

More help:
  stackpack <command> --help
  stackpack presets --help
`;

const packageManagerOption = new Option(
  "--package-manager <manager>",
  "package manager to use",
).choices(["npm", "pnpm", "yarn", "bun"]);

async function runMainMenu(): Promise<void> {
  p.intro("StackPack");
  p.log.message("Official project tooling with real-world integrations.");
  p.log.message("Presets stay on this device.");
  p.log.message(pc.dim("Ctrl+C on any question brings you back to this menu instead of exiting."));

  const updateNotice = await getUpdateNotice(VERSION);
  if (updateNotice) {
    p.log.warn(pc.yellow(updateNotice));
  }

  for (;;) {
    const choice = await p.select({
      message: "What would you like to do?",
      options: [
        { value: "new", label: "Create a new project" },
        { value: "add", label: "Add integrations to the current project" },
        { value: "scan", label: "Scan the current project" },
        {
          value: "save",
          label: "Save this project's stack as a preset",
          hint: "scan integrations, then choose which other packages to keep",
        },
        { value: "presets", label: "View saved presets" },
        { value: "exit", label: "Exit" },
      ],
    });
    if (p.isCancel(choice) || choice === "exit") {
      p.outro("Goodbye.");
      return;
    }

    try {
      switch (choice) {
        case "new":
          await runNew(undefined, {});
          break;
        case "add":
          await runAdd({});
          break;
        case "scan":
          await runScan();
          break;
        case "save":
          await runSaveInteractive();
          break;
        case "presets":
          await runPresetsBrowser();
          break;
      }
    } catch (error) {
      if (error instanceof CancelledError) {
        p.log.info("Cancelled — back to the main menu.");
        continue;
      }
      printError(error);
    }
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
    .option("--no-color", "disable colored output")
    .addHelpText("after", CLI_HELP_EPILOG);

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
    .description("Scan the current project and choose what to save as a preset")
    .argument("<preset-name>", "name for the preset")
    .option("--local", "store the preset inside this project (.stackpack/)")
    .option("--global", "store the preset in your home directory (default)")
    .option("--all-packages", "include every portable dependency without asking")
    .option("--integrations-only", "save integrations without other dependencies")
    .option(
      "--exclude-integration <ids...>",
      "exclude detected integration ids (for example: shadcn)",
    )
    .action(
      async (
        name: string,
        options: {
          local?: boolean;
          global?: boolean;
          allPackages?: boolean;
          integrationsOnly?: boolean;
          excludeIntegration?: string[];
        },
      ) => {
        if (options.allPackages && options.integrationsOnly) {
          throw new StackPackError(
            "Choose either --all-packages or --integrations-only, not both.",
          );
        }
        await runSave(name, {
          ...options,
          packageSelection: options.allPackages
            ? "all"
            : options.integrationsOnly
              ? "none"
              : undefined,
          integrationSelection: options.allPackages || options.integrationsOnly ? "all" : undefined,
          excludedIntegrationIds: options.excludeIntegration,
        });
      },
    );

  program
    .command("apply")
    .description("Apply a saved preset's integrations to the current project")
    .argument("<preset-name>", "preset to apply")
    .option("--dry-run", "show the full plan without changing anything")
    .action(async (name: string, options: { dryRun?: boolean }) => {
      await runApply(name, options);
    });

  program
    .command("install")
    .alias("i")
    .description("Create a project from a saved preset in one shot (express mode)")
    .argument("<preset-name>", "saved preset to install from")
    .argument("[project-name]", "project folder to create (asked interactively if omitted)")
    .addOption(packageManagerOption)
    .action(
      async (
        presetName: string,
        projectName: string | undefined,
        options: { packageManager?: PackageManager },
      ) => {
        await runExpressInstall(presetName, projectName, options);
      },
    );

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
    .command("edit")
    .description("Edit a saved preset's integrations (no project is touched)")
    .argument("<preset-name>")
    .action(async (name: string) => {
      await runPresetsEdit(name);
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
