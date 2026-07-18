export type AnswerValue = string | boolean;
export type Answers = Record<string, AnswerValue>;

/** All keys must match; an array value means "any of these". */
export type Condition = Record<
  string,
  AnswerValue | ReadonlyArray<AnswerValue>
>;

export type PackageRef = string | { name: string; version: string };

export interface PackageRule {
  when?: Condition;
  packages: PackageRef[];
}

export interface FileRule {
  when?: Condition;
  path: string;
  content: string;
}

export interface ScriptRule {
  when?: Condition;
  scripts: Record<string, string>;
}

export interface NoteRule {
  when?: Condition;
  message: string;
}

export interface QuestionOption {
  value: string;
  label: string;
  hint?: string;
}

export interface RecipeQuestion {
  id: string;
  message: string;
  type: "select" | "confirm";
  when?: Condition;
  options?: QuestionOption[];
  initialValue?: AnswerValue;
}

export interface Recipe {
  id: string;
  name: string;
  category: "framework" | "feature" | "shared";
  /** Feature slot this recipe fills, e.g. "router", "testing". */
  feature?: string;
  /** Framework ids this recipe supports; omit for framework recipes. */
  supports?: string[];
  questions?: RecipeQuestion[];
  dependencies?: PackageRule[];
  devDependencies?: PackageRule[];
  files?: FileRule[];
  scripts?: ScriptRule[];
  notes?: NoteRule[];
}

export interface FeatureOption {
  value: string;
  label: string;
  hint?: string;
  recipeId: string | null;
}

export interface FeatureDef {
  id: string;
  message: string;
  supports: string[];
  options: FeatureOption[];
}
