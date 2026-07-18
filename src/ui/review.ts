import { formatPackage } from "../utils/package-parser.js";
import type { Preset } from "../schemas/preset-schema.js";

function section(title: string, lines: string[]): string {
  if (lines.length === 0) return "";
  return `${title}\n${lines.map((l) => `  ${l}`).join("\n")}\n\n`;
}

function packageLines(record: Record<string, string>): string[] {
  return Object.entries(record).map(([n, v]) => formatPackage(n, v));
}

export function renderReview(preset: Preset): string {
  const env = preset.environment;
  const envLines = [env.framework, env.language, env.buildTool].filter(
    (v): v is string => Boolean(v) && v !== "existing"
  );

  const featureLines = Object.entries(preset.selections)
    .filter(([key]) => !["language", "buildTool", "framework"].includes(key))
    .map(([key, value]) => {
      const label = key.replace(/([A-Z])/g, " $1").toLowerCase();
      const pretty =
        typeof value === "boolean" ? (value ? "Yes" : "No") : String(value);
      return `${label[0].toUpperCase()}${label.slice(1)}: ${pretty}`;
    });

  return (
    section("Preset", [preset.displayName, `(${preset.name}, ${preset.scope})`]) +
    section("Environment", envLines) +
    section("Features", featureLines) +
    section("Dependencies", packageLines(preset.dependencies)) +
    section("Dev Dependencies", packageLines(preset.devDependencies)) +
    section("Files to generate", preset.files.map((f) => f.path)) +
    section("Scripts to add", Object.keys(preset.scripts))
  ).trimEnd();
}
