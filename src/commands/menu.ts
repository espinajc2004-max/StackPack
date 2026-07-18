import * as p from "@clack/prompts";
import { ensureDirs, isFirstRun, presetsDir } from "../storage/paths.js";
import { listPresets } from "../storage/preset-store.js";
import { loadConfig, saveConfig } from "../storage/config.js";
import { PACKAGE_MANAGERS } from "../package-manager/detect.js";
import { must } from "../ui/prompts.js";
import { renderBanner } from "../ui/banner.js";
import { createCommand } from "./create.js";
import { installCommand } from "./install.js";
import { listCommand, describePreset } from "./list.js";
import { showCommand } from "./show.js";
import { editCommand } from "./edit.js";
import { deleteCommand } from "./delete.js";
import { duplicateCommand } from "./duplicate.js";
import { exportCommand } from "./export.js";
import { importCommand } from "./import.js";
import { scanCommand } from "./scan.js";

async function pickPreset(message: string): Promise<string | null> {
  const presets = listPresets();
  if (presets.length === 0) {
    p.log.info("No presets yet. Create one first.");
    return null;
  }
  return must(
    await p.select({
      message,
      options: presets.map((s) => ({
        value: s.preset.name,
        label: s.preset.displayName,
        hint: s.scope === "local" ? "project-local" : undefined,
      })),
    })
  );
}

async function viewPresetsFlow(): Promise<void> {
  const name = await pickPreset("Choose a preset");
  if (!name) return;

  const action = must(
    await p.select({
      message: `What do you want to do with "${name}"?`,
      options: [
        { value: "install", label: "Install" },
        { value: "show", label: "Show" },
        { value: "edit", label: "Edit" },
        { value: "duplicate", label: "Duplicate" },
        { value: "export", label: "Export" },
        { value: "delete", label: "Delete" },
        { value: "back", label: "Back" },
      ],
    })
  );

  switch (action) {
    case "install":
      return installCommand(name, undefined, {});
    case "show":
      return showCommand(name);
    case "edit":
      return editCommand(name);
    case "duplicate":
      return duplicateCommand(name);
    case "export":
      return exportCommand(name, {});
    case "delete":
      return deleteCommand(name, {});
  }
}

async function settingsFlow(): Promise<void> {
  const config = loadConfig();
  const pm = must(
    await p.select({
      message: "Default package manager when none can be detected",
      initialValue: config.defaultPackageManager ?? "npm",
      options: PACKAGE_MANAGERS.map((manager) => ({
        value: manager,
        label: manager,
      })),
    })
  );
  saveConfig({ ...config, defaultPackageManager: pm });
  p.log.success(`Default package manager set to ${pm}.`);
}

export async function menuCommand(): Promise<void> {
  const firstRun = isFirstRun();
  ensureDirs();

  console.log(renderBanner());
  p.intro("StackPack");
  if (firstRun) {
    p.note(
      [
        "StackPack works locally.",
        "",
        "Presets will be stored at:",
        presetsDir(),
        "",
        "No account is required.",
        "Your presets are not uploaded.",
      ].join("\n"),
      "Welcome"
    );
  }

  for (;;) {
    const action = must(
      await p.select({
        message: "What would you like to do?",
        options: [
          { value: "create", label: "Create a preset" },
          { value: "install", label: "Install a preset" },
          { value: "view", label: "View presets" },
          { value: "import", label: "Import a preset" },
          { value: "scan", label: "Scan current project" },
          { value: "settings", label: "Settings" },
          { value: "exit", label: "Exit" },
        ],
      })
    );

    switch (action) {
      case "create":
        await createCommand({});
        break;
      case "install": {
        const name = await pickPreset("Which preset do you want to install?");
        if (name) await installCommand(name, undefined, {});
        break;
      }
      case "view":
        await listCommand();
        await viewPresetsFlow();
        break;
      case "import": {
        const file = must(
          await p.text({
            message: "Path to a .stackpack.json file",
            placeholder: "./my-react-stack.stackpack.json",
            validate: (v) => (v.trim() ? undefined : "A file path is required"),
          })
        ).trim();
        await importCommand(file);
        break;
      }
      case "scan":
        await scanCommand();
        break;
      case "settings":
        await settingsFlow();
        break;
      case "exit":
        p.outro("Bye!");
        return;
    }
  }
}
