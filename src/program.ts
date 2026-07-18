import { Command } from "commander";
import { menuCommand } from "./commands/menu.js";
import { createCommand } from "./commands/create.js";
import { installCommand } from "./commands/install.js";
import { listCommand } from "./commands/list.js";
import { showCommand } from "./commands/show.js";
import { editCommand } from "./commands/edit.js";
import { deleteCommand } from "./commands/delete.js";
import { duplicateCommand } from "./commands/duplicate.js";
import { exportCommand } from "./commands/export.js";
import { importCommand } from "./commands/import.js";
import { scanCommand } from "./commands/scan.js";
import { doctorCommand } from "./commands/doctor.js";
import { fail } from "./ui/prompts.js";

const program = new Command();

program
  .name("stackpack")
  .description("Build your stack once. Reuse it anywhere. Local-first stack presets.")
  .version("0.2.0")
  .option("--no-color", "disable colored output")
  .action(menuCommand);

program
  .command("create")
  .description("Create a preset interactively")
  .option("--global", "save to the global preset directory (default)")
  .option("--local", "save to ./.stackpack in this project")
  .action(createCommand);

program
  .command("install")
  .argument("<preset>", "preset name")
  .argument("[directory]", "target project folder (created if missing)")
  .description("Install a preset into a new project folder or the current directory")
  .option("-y, --yes", "skip confirmation prompts")
  .option("--dry-run", "show what would happen without installing")
  .option("--package-manager <pm>", "npm, pnpm, yarn or bun")
  .option("-f, --force", "overwrite existing files and scripts")
  .action(installCommand);

program.command("list").alias("ls").description("List saved presets").action(listCommand);

program
  .command("show")
  .argument("<preset>", "preset name")
  .description("Show a preset's full contents")
  .action(showCommand);

program
  .command("edit")
  .argument("<preset>", "preset name")
  .description("Edit a saved preset")
  .action(editCommand);

program
  .command("delete")
  .alias("rm")
  .argument("<preset>", "preset name")
  .option("-y, --yes", "skip the confirmation prompt")
  .description("Delete a preset (a backup copy is kept)")
  .action(deleteCommand);

program
  .command("duplicate")
  .argument("<preset>", "preset name")
  .description("Duplicate a preset under a new name")
  .action(duplicateCommand);

program
  .command("export")
  .argument("<preset>", "preset name")
  .option("-o, --output <file>", "output file (default: <name>.stackpack.json)")
  .description("Export a preset to a shareable file")
  .action(exportCommand);

program
  .command("import")
  .argument("<file>", "a .stackpack.json file")
  .description("Import a preset from a file")
  .action(importCommand);

program
  .command("scan")
  .description("Detect this project's stack and optionally save it as a preset")
  .action(scanCommand);

program
  .command("doctor")
  .description("Check your StackPack installation and presets")
  .action(doctorCommand);

program.parseAsync(process.argv).catch(fail);
