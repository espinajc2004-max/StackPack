import * as p from "@clack/prompts";
import {
  PRESET_SCHEMA_VERSION,
  type Preset,
} from "../schemas/preset-schema.js";
import { presetExists, savePreset } from "../storage/preset-store.js";
import { readPackageJson } from "../project/package-json.js";
import { detectStack, type Detection } from "../project/detect-stack.js";
import { slugifyPresetName, validatePresetName } from "../utils/sanitize-name.js";
import { StackPackError, SYM } from "../utils/errors.js";
import { must, runCommand } from "../ui/prompts.js";

function renderDetections(detections: Detection[]): string {
  return detections
    .map(
      (d) =>
        `${d.label}\n  ${d.found ? `${SYM.ok} ${d.found}` : `${SYM.err} None detected`}`
    )
    .join("\n\n");
}

export async function scanCommand(): Promise<void> {
  await runCommand(async () => {
    const cwd = process.cwd();
    const pkg = await readPackageJson(cwd);
    if (!pkg) {
      throw new StackPackError(
        "No package.json found in the current directory",
        "Run stackpack scan inside a project."
      );
    }

    p.intro("Project analysis");
    const detections = detectStack(pkg);
    p.note(renderDetections(detections), "Detected stack");

    const action = must(
      await p.select({
        message: "What would you like to do?",
        options: [
          { value: "save", label: "Save this project as a preset" },
          { value: "exit", label: "Exit" },
        ],
      })
    );
    if (action === "exit") {
      p.outro("Nothing saved.");
      return;
    }

    const displayName = must(
      await p.text({
        message: "Preset name",
        initialValue: pkg.name ?? "my-stack",
        validate: (v) => {
          if (!v.trim()) return "A name is required";
          return validatePresetName(slugifyPresetName(v));
        },
      })
    ).trim();
    const name = slugifyPresetName(displayName);

    if (presetExists(name, "global")) {
      const overwrite = must(
        await p.confirm({
          message: `Preset "${name}" already exists. Overwrite it?`,
          initialValue: false,
        })
      );
      if (!overwrite) {
        p.cancel("Nothing saved.");
        return;
      }
    }

    const byCategory = new Map(detections.map((d) => [d.category, d]));
    const framework = byCategory.get("framework")?.found ?? undefined;
    const isFrontend = ["react", "vue", "svelte"].includes(framework ?? "");

    const selections: Record<string, string> = {};
    for (const d of detections) {
      if (d.found && !["framework", "language", "buildTool"].includes(d.category)) {
        selections[d.category] = d.found;
      }
    }

    const now = new Date().toISOString();
    const preset: Preset = {
      schemaVersion: PRESET_SCHEMA_VERSION,
      name,
      displayName,
      scope: "global",
      createdAt: now,
      updatedAt: now,
      environment: {
        type: framework ? (isFrontend ? "frontend" : "backend") : "general",
        framework,
        language: byCategory.get("language")?.found ? "typescript" : "javascript",
        buildTool: byCategory.get("buildTool")?.found ?? undefined,
      },
      selections,
      dependencies: { ...pkg.dependencies },
      devDependencies: { ...pkg.devDependencies },
      recipes: detections
        .map((d) => d.recipeId)
        .filter((id): id is string => Boolean(id)),
      files: [],
      scripts: { ...pkg.scripts },
    };

    const filePath = savePreset(preset);
    p.outro(
      `${SYM.ok} Saved "${displayName}" to ${filePath}\nInstall it anywhere with: stackpack install ${name}`
    );
  });
}
