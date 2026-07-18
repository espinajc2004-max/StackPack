import { listPresets, type StoredPreset } from "../storage/preset-store.js";
import { runCommand } from "../ui/prompts.js";

export function describePreset(stored: StoredPreset): string {
  const { preset, scope } = stored;
  const env = preset.environment;
  const tags = [env.framework, env.language, env.buildTool]
    .filter((v): v is string => Boolean(v) && v !== "existing")
    .join(" · ");
  const updated = new Date(preset.updatedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const scopeTag = scope === "local" ? "\n  Project-local" : "";
  return `  ${preset.displayName}\n  ${tags || "general"}\n  Updated ${updated}${scopeTag}`;
}

export async function listCommand(): Promise<void> {
  await runCommand(() => {
    const presets = listPresets();
    if (presets.length === 0) {
      console.log("No presets yet. Run: stackpack create");
      return;
    }
    console.log("┌  Saved presets\n");
    console.log(presets.map(describePreset).join("\n\n"));
  });
}
