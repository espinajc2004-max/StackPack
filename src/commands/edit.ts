import * as p from "@clack/prompts";
import { loadPreset, savePreset } from "../storage/preset-store.js";
import { must, runCommand } from "../ui/prompts.js";
import {
  addCustomPackages,
  editVersions,
  type SelectedPackages,
} from "../ui/package-selector.js";
import { renderReview } from "../ui/review.js";
import { SYM } from "../utils/errors.js";

export async function editCommand(name: string): Promise<void> {
  await runCommand(async () => {
    const stored = loadPreset(name);
    const preset = structuredClone(stored.preset);

    p.intro(`Edit preset "${preset.displayName}"`);

    for (;;) {
      const action = must(
        await p.select({
          message: "What do you want to change?",
          options: [
            { value: "rename", label: "Display name" },
            { value: "add", label: "Add packages" },
            { value: "remove", label: "Remove packages" },
            { value: "versions", label: "Set package versions" },
            { value: "review", label: "Review current state" },
            { value: "save", label: "Save and exit" },
            { value: "discard", label: "Discard changes" },
          ],
        })
      );

      if (action === "rename") {
        preset.displayName = must(
          await p.text({
            message: "Display name",
            initialValue: preset.displayName,
            validate: (v) => (v.trim() ? undefined : "A name is required"),
          })
        ).trim();
        continue;
      }

      const selected: SelectedPackages = {
        dependencies: preset.dependencies,
        devDependencies: preset.devDependencies,
      };

      if (action === "add") {
        await addCustomPackages(selected);
        continue;
      }
      if (action === "versions") {
        await editVersions(selected);
        continue;
      }
      if (action === "remove") {
        const all = [
          ...Object.keys(preset.dependencies).map((n) => `dependencies:${n}`),
          ...Object.keys(preset.devDependencies).map((n) => `devDependencies:${n}`),
        ];
        if (all.length === 0) {
          p.log.info("This preset has no packages.");
          continue;
        }
        const toRemove = must(
          await p.multiselect({
            message: "Select packages to remove (Space to select)",
            options: all.map((key) => {
              const [kind, ...parts] = key.split(":");
              return {
                value: key,
                label: parts.join(":"),
                hint: kind === "devDependencies" ? "dev" : undefined,
              };
            }),
            required: false,
          })
        ) as string[];
        for (const key of toRemove) {
          const [kind, ...parts] = key.split(":");
          const pkgName = parts.join(":");
          if (kind === "dependencies") delete preset.dependencies[pkgName];
          else delete preset.devDependencies[pkgName];
        }
        if (toRemove.length > 0) {
          p.log.success(`${SYM.ok} Removed ${toRemove.length} package(s)`);
        }
        continue;
      }
      if (action === "review") {
        p.note(renderReview(preset), "Current state");
        continue;
      }
      if (action === "save") {
        preset.updatedAt = new Date().toISOString();
        savePreset(preset);
        p.outro(`${SYM.ok} Saved "${preset.displayName}".`);
        return;
      }
      p.cancel("Changes discarded.");
      return;
    }
  });
}
