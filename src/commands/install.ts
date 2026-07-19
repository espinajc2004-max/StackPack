import fs from "node:fs";
import path from "node:path";
import * as p from "@clack/prompts";
import { loadPreset } from "../storage/preset-store.js";
import { loadConfig } from "../storage/config.js";
import {
  detectPackageManager,
  isPackageManager,
  type PackageManager,
} from "../package-manager/detect.js";
import { formatInstallCommand } from "../package-manager/commands.js";
import { runInstall } from "../package-manager/install.js";
import {
  createMinimalPackageJson,
  mergeScripts,
  readPackageJson,
} from "../project/package-json.js";
import { validateProjectFolderName } from "../utils/sanitize-name.js";
import { StackPackError, SYM } from "../utils/errors.js";
import { must, runCommand } from "../ui/prompts.js";
import { renderReview } from "../ui/review.js";
import type { Preset } from "../schemas/preset-schema.js";

export interface InstallOptions {
  yes?: boolean;
  dryRun?: boolean;
  packageManager?: string;
  force?: boolean;
}

interface Target {
  dir: string;
  /** True when StackPack created this folder for a brand-new project. */
  isNewProject: boolean;
}

async function chooseTarget(
  preset: Preset,
  directoryArg: string | undefined,
  options: InstallOptions
): Promise<Target> {
  const invokedFrom = process.cwd();

  if (directoryArg) {
    const dir = path.resolve(invokedFrom, directoryArg);
    const isNewProject = !fs.existsSync(dir);
    fs.mkdirSync(dir, { recursive: true });
    return { dir, isNewProject };
  }

  // --yes with no directory stays scriptable: install right here
  if (options.yes || options.dryRun) {
    return { dir: invokedFrom, isNewProject: false };
  }

  // Never install into an existing project silently — always ask first.
  const existingPkg = await readPackageJson(invokedFrom);
  if (existingPkg) {
    const where = must(
      await p.select({
        message: `${SYM.warn} An existing project ("${existingPkg.name ?? path.basename(invokedFrom)}") was detected here. Where should the stack go?`,
        options: [
          {
            value: "new",
            label: "Create a new project folder",
            hint: "recommended",
          },
          {
            value: "here",
            label: "Install into this existing project",
            hint: invokedFrom,
          },
        ],
      })
    );
    if (where === "here") return { dir: invokedFrom, isNewProject: false };
  }

  const projectName = must(
    await p.text({
      message: `Project name — this becomes the folder name (it can be different from the preset name "${preset.name}")`,
      placeholder: preset.name,
      defaultValue: preset.name,
      validate: (v) => (v ? validateProjectFolderName(v) : undefined),
    })
  ).trim();

  const dir = path.join(invokedFrom, projectName);
  if (fs.existsSync(dir) && fs.readdirSync(dir).length > 0) {
    const proceed = must(
      await p.confirm({
        message: `${SYM.warn} Folder "${projectName}" already exists and is not empty. Install into it anyway?`,
        initialValue: false,
      })
    );
    if (!proceed) {
      throw new StackPackError(
        "Installation cancelled",
        "Choose a different project name and try again."
      );
    }
    return { dir, isNewProject: false };
  }

  fs.mkdirSync(dir, { recursive: true });
  return { dir, isNewProject: true };
}

async function choosePackageManager(
  cwd: string,
  options: InstallOptions
): Promise<PackageManager> {
  if (options.packageManager) {
    if (!isPackageManager(options.packageManager)) {
      throw new StackPackError(
        `Unknown package manager "${options.packageManager}"`,
        "Use one of: npm, pnpm, yarn, bun"
      );
    }
    return options.packageManager;
  }

  const detection = detectPackageManager(cwd);
  if (detection.lockfileManagers.length > 1 && !options.yes) {
    p.log.warn(
      `${SYM.warn} Multiple package-manager lockfiles detected: ${detection.lockfileManagers.join(", ")}`
    );
    return must(
      await p.select({
        message: "Which package manager should StackPack use?",
        options: detection.lockfileManagers.map((pm) => ({ value: pm, label: pm })),
      })
    ) as PackageManager;
  }
  if (detection.manager) return detection.manager;
  return loadConfig().defaultPackageManager ?? "npm";
}

function renderPreview(preset: Preset, pm: PackageManager): string {
  const lines: string[] = [];
  const deps = formatInstallCommand(pm, preset.dependencies, false);
  const devDeps = formatInstallCommand(pm, preset.devDependencies, true);
  if (deps) lines.push(deps);
  if (devDeps) lines.push(devDeps);
  if (preset.files.length > 0) {
    lines.push("", "Files to generate:", ...preset.files.map((f) => `  ${f.path}`));
  }
  const scriptKeys = Object.keys(preset.scripts);
  if (scriptKeys.length > 0) {
    lines.push("", "Scripts to add:", ...scriptKeys.map((s) => `  ${s}`));
  }
  return lines.join("\n");
}

async function writeFiles(
  preset: Preset,
  cwd: string,
  options: InstallOptions
): Promise<{ written: string[]; skipped: string[] }> {
  const written: string[] = [];
  const skipped: string[] = [];

  for (const file of preset.files) {
    const target = path.resolve(cwd, file.path);
    if (!target.startsWith(path.resolve(cwd) + path.sep)) {
      skipped.push(`${file.path} (outside project directory)`);
      continue;
    }

    if (fs.existsSync(target)) {
      if (options.force) {
        // fall through and replace
      } else if (options.yes) {
        skipped.push(file.path);
        continue;
      } else {
        let action = "";
        for (;;) {
          action = must(
            await p.select({
              message: `${SYM.warn} ${file.path} already exists`,
              options: [
                { value: "skip", label: "Skip this file" },
                { value: "show", label: "Show proposed changes" },
                { value: "replace", label: "Replace file" },
                { value: "cancel", label: "Cancel installation" },
              ],
            })
          );
          if (action !== "show") break;
          p.note(file.content, `Proposed content of ${file.path}`);
        }
        if (action === "cancel") {
          throw new StackPackError(
            "Installation cancelled",
            "No further files were modified."
          );
        }
        if (action === "skip") {
          skipped.push(file.path);
          continue;
        }
      }
    }

    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, file.content, "utf8");
    written.push(file.path);
  }
  return { written, skipped };
}

export async function installCommand(
  name: string,
  directoryArg: string | undefined,
  options: InstallOptions = {}
): Promise<void> {
  await runCommand(async () => {
    const { preset } = loadPreset(name);

    p.intro("Install preset");
    const target = await chooseTarget(preset, directoryArg, options);
    const pm = await choosePackageManager(target.dir, options);

    p.note(
      [
        `Preset\n  ${preset.displayName}`,
        `Target directory\n  ${target.dir}${target.isNewProject ? "  (new project)" : ""}`,
        `Package manager\n  ${pm}`,
        `Packages\n  ${Object.keys(preset.dependencies).length} dependencies\n  ${Object.keys(preset.devDependencies).length} devDependencies`,
        `Files\n  ${preset.files.length} configuration files`,
        `Scripts\n  ${Object.keys(preset.scripts).length} package.json scripts`,
      ].join("\n\n"),
      preset.displayName
    );

    if (options.dryRun) {
      p.note(renderPreview(preset, pm), "Dry run — nothing will be installed");
      p.outro("Dry run complete.");
      return;
    }

    if (!options.yes) {
      p.note(renderReview(preset), "Final review — nothing is installed yet");
      for (;;) {
        const decision = must(
          await p.select({
            message: "Start the installation?",
            options: [
              { value: "install", label: "Install" },
              { value: "preview", label: "Preview commands" },
              { value: "cancel", label: "Cancel" },
            ],
          })
        );
        if (decision === "preview") {
          p.note(renderPreview(preset, pm), "Preview");
          continue;
        }
        if (decision === "cancel") {
          p.cancel("Nothing installed.");
          return;
        }
        break;
      }
    }

    if (!(await readPackageJson(target.dir))) {
      // A folder StackPack just created (or one given via CLI arg, or --yes)
      // gets a package.json without an extra prompt — the user already named
      // the project. Only an existing directory asks first.
      if (!target.isNewProject && !options.yes && !directoryArg) {
        const create = must(
          await p.confirm({
            message: "No package.json found here. Create one?",
            initialValue: true,
          })
        );
        if (!create) {
          throw new StackPackError(
            "A package.json is required to install a preset"
          );
        }
      }
      const pkg = await createMinimalPackageJson(target.dir);
      p.log.success(`${SYM.ok} Created package.json (${pkg.name})`);
    }

    if (Object.keys(preset.dependencies).length > 0) {
      p.log.step("Installing dependencies");
      await runInstall(pm, preset.dependencies, false, target.dir);
    }
    if (Object.keys(preset.devDependencies).length > 0) {
      p.log.step("Installing dev dependencies");
      await runInstall(pm, preset.devDependencies, true, target.dir);
    }

    if (preset.files.length > 0) p.log.step("Generating configuration files");
    const files = await writeFiles(preset, target.dir, options);
    for (const f of files.written) p.log.success(`${SYM.ok} Wrote ${f}`);
    for (const f of files.skipped) p.log.warn(`${SYM.warn} Skipped ${f}`);

    if (Object.keys(preset.scripts).length > 0) {
      p.log.step("Updating package.json scripts");
    }
    const scripts = await mergeScripts(
      target.dir,
      preset.scripts,
      options.force ?? false
    );
    if (scripts.added.length > 0) {
      p.log.success(`${SYM.ok} Added scripts: ${scripts.added.join(", ")}`);
    }
    if (scripts.skipped.length > 0) {
      p.log.warn(
        `${SYM.warn} Kept existing scripts (use --force to overwrite): ${scripts.skipped.join(", ")}`
      );
    }

    const installed =
      Object.keys(preset.dependencies).length +
      Object.keys(preset.devDependencies).length;
    const nextSteps = target.isNewProject
      ? `\n\n   Next steps:\n   cd ${path.basename(target.dir)}\n   ${pm} run dev`
      : "";
    p.outro(
      `Stack installed successfully\n\n   Preset: ${preset.displayName}\n   Package manager: ${pm}\n   Packages installed: ${installed}\n   Files generated: ${files.written.length}${nextSteps}`
    );
  });
}
