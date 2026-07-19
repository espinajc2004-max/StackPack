import * as p from "@clack/prompts";
import {
  PRESET_SCHEMA_VERSION,
  type Preset,
  type PresetEnvironment,
} from "../schemas/preset-schema.js";
import { presetExists, savePreset } from "../storage/preset-store.js";
import { presetsDir } from "../storage/paths.js";
import {
  backendFrameworks,
  featuresForFrameworks,
  frontendFrameworks,
  getRecipe,
  ormRecipes,
  TS_ONLY_FRAMEWORKS,
} from "../recipes/registry.js";
import type { Answers, Recipe, RecipeQuestion } from "../recipes/types.js";
import { matchesCondition, resolvePlan } from "../engine/resolve.js";
import { slugifyPresetName, validatePresetName } from "../utils/sanitize-name.js";
import { must, runCommand } from "../ui/prompts.js";
import {
  addCustomPackages,
  editVersions,
  selectCuratedExtras,
  type SelectedPackages,
} from "../ui/package-selector.js";
import { renderReview } from "../ui/review.js";

interface CreateOptions {
  local?: boolean;
  global?: boolean;
}

const DEV_ONLY_EXTRAS = new Set(["tailwindcss"]);

async function askRecipeQuestions(recipe: Recipe, answers: Answers): Promise<void> {
  for (const question of recipe.questions ?? []) {
    if (!matchesCondition(question.when, answers)) continue;
    answers[question.id] = await askQuestion(question);
  }
}

async function askQuestion(question: RecipeQuestion): Promise<string | boolean> {
  if (question.type === "confirm") {
    return must(
      await p.confirm({
        message: question.message,
        initialValue: Boolean(question.initialValue ?? false),
      })
    );
  }
  return must(
    await p.select({
      message: question.message,
      options: (question.options ?? []).map((o) => ({
        value: o.value,
        label: o.label,
        hint: o.hint,
      })),
    })
  );
}

/** One step of the framework sequence: pick from a list of recipes or None. */
async function pickFramework(
  message: string,
  recipes: Recipe[],
  answers: Answers,
  usedRecipes: Recipe[]
): Promise<string> {
  const language = answers.language;
  const available = recipes.filter(
    (r) => !(language === "javascript" && TS_ONLY_FRAMEWORKS.has(r.id))
  );

  const choice = must(
    await p.select({
      message,
      options: [
        ...available.map((r) => ({
          value: r.id,
          label: r.name,
          hint: TS_ONLY_FRAMEWORKS.has(r.id) ? "TypeScript" : undefined,
        })),
        { value: "none", label: "None" },
      ],
    })
  );

  if (choice !== "none") {
    const recipe = getRecipe(choice)!;
    usedRecipes.push(recipe);
    await askRecipeQuestions(recipe, answers);
  }
  return choice;
}

type FlowResult = "save" | "back" | "cancel";

async function runCreateFlow(scope: "global" | "local"): Promise<FlowResult> {
  const displayName = must(
    await p.text({
      message: "Preset name",
      placeholder: "My React Stack",
      validate: (v) => {
        if (!v.trim()) return "A name is required";
        const slug = slugifyPresetName(v);
        return validatePresetName(slug) && "Name produces an invalid file name";
      },
    })
  ).trim();
  const name = slugifyPresetName(displayName);

  if (presetExists(name, scope)) {
    const overwrite = must(
      await p.confirm({
        message: `Preset "${name}" already exists. Overwrite it?`,
        initialValue: false,
      })
    );
    if (!overwrite) return "cancel";
  }

  const answers: Answers = {};
  const usedRecipes: Recipe[] = [];

  answers.language = must(
    await p.select({
      message: "Choose a language",
      options: [
        { value: "typescript", label: "TypeScript" },
        { value: "javascript", label: "JavaScript" },
      ],
    })
  );

  // 1. Frontend → 2. Backend → 3. ORM
  const frontend = await pickFramework(
    "Choose a frontend framework",
    frontendFrameworks,
    answers,
    usedRecipes
  );
  answers.frontend = frontend;

  const backend = await pickFramework(
    "Choose a backend framework",
    backendFrameworks,
    answers,
    usedRecipes
  );
  answers.backend = backend;

  const orm = await pickFramework(
    "Choose an ORM / database toolkit",
    ormRecipes,
    answers,
    usedRecipes
  );
  answers.orm = orm;

  // 4. Feature questions for whatever frameworks were selected
  const selectedFrameworks = [frontend, backend].filter((f) => f !== "none");
  for (const feature of featuresForFrameworks(selectedFrameworks)) {
    const value = must(
      await p.select({
        message: feature.message,
        options: feature.options.map((o) => ({
          value: o.value,
          label: o.label,
          hint: o.hint,
        })),
      })
    );
    answers[feature.id] = value;
    const option = feature.options.find((o) => o.value === value);
    if (option?.recipeId) {
      const featureRecipe = getRecipe(option.recipeId)!;
      usedRecipes.push(featureRecipe);
      await askRecipeQuestions(featureRecipe, answers);
    }
  }

  const plan = resolvePlan(usedRecipes, answers);
  for (const note of plan.notes) p.log.warn(note);

  const selected: SelectedPackages = {
    dependencies: { ...plan.dependencies },
    devDependencies: { ...plan.devDependencies },
  };

  for (const extra of await selectCuratedExtras()) {
    if (DEV_ONLY_EXTRAS.has(extra)) selected.devDependencies[extra] ??= "latest";
    else selected.dependencies[extra] ??= "latest";
  }
  await addCustomPackages(selected);
  await editVersions(selected);

  const environment: PresetEnvironment = {
    type:
      frontend !== "none" && backend !== "none"
        ? "fullstack"
        : frontend !== "none"
          ? "frontend"
          : backend !== "none"
            ? "backend"
            : "general",
    framework: frontend !== "none" ? frontend : backend !== "none" ? backend : undefined,
    language:
      answers.language === "typescript" || answers.language === "javascript"
        ? answers.language
        : undefined,
    buildTool:
      frontend === "react"
        ? typeof answers.buildTool === "string"
          ? answers.buildTool
          : undefined
        : frontend === "vue"
          ? "vite"
          : frontend === "next"
            ? "next"
            : undefined,
  };

  const now = new Date().toISOString();
  const preset: Preset = {
    schemaVersion: PRESET_SCHEMA_VERSION,
    name,
    displayName,
    scope,
    createdAt: now,
    updatedAt: now,
    environment,
    selections: answers,
    dependencies: selected.dependencies,
    devDependencies: selected.devDependencies,
    recipes: usedRecipes.map((r) => r.id),
    files: plan.files,
    scripts: plan.scripts,
  };

  p.note(renderReview(preset), "Review preset");

  const decision = must(
    await p.select({
      message: "Save this preset?",
      options: [
        { value: "save", label: "Save" },
        { value: "back", label: "Go back", hint: "restart the questions" },
        { value: "cancel", label: "Cancel" },
      ],
    })
  ) as FlowResult;

  if (decision === "save") {
    const filePath = savePreset(preset);
    p.outro(
      `Saved "${preset.displayName}" to ${filePath}\nInstall it with: stackpack install ${preset.name}`
    );
  }
  return decision;
}

export async function createCommand(options: CreateOptions = {}): Promise<void> {
  await runCommand(async () => {
    const scope: "global" | "local" = options.local ? "local" : "global";
    p.intro("Create a preset");
    if (scope === "global") p.log.info(`Presets are stored at: ${presetsDir()}`);
    else p.log.info("This preset will be saved in ./.stackpack (project-local).");

    for (;;) {
      const result = await runCreateFlow(scope);
      if (result === "save") return;
      if (result === "cancel") {
        p.cancel("Nothing saved.");
        return;
      }
      // "back" → restart the flow
    }
  });
}
