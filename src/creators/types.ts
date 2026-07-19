import type { CommandDefinition, PackageManager } from "../package-manager/types.js";

export type CreatorId = "vite" | "next";

export type CreatorOptions = {
  /**
   * Omitted when the official creator asks for the language itself (custom
   * setups). The real language is always re-detected after creation.
   */
  language?: "typescript" | "javascript";
  /**
   * How the official creator should decide the remaining project options.
   * "recommended" answers everything with the official defaults; "custom"
   * runs the creator with no flags at all so it asks its own step-by-step
   * questions. Adapters that have no extra questions ignore this.
   */
  setupStyle?: "recommended" | "custom";
};

export type CreatorAdapter = {
  id: CreatorId;
  name: string;
  /** The official tool name, shown in the pre-creation summary. */
  officialTool: string;
  frameworkLabel: string;
  /** Human description of the template that will be used. */
  templateLabel(options: CreatorOptions): string;
  /**
   * Owns every creator-specific question for a fresh setup, including the
   * language when the official creator does not ask it itself. Skipped when
   * installing from a preset.
   */
  collectOptions?(): Promise<CreatorOptions>;
  /**
   * Builds the official creator command. Creator-specific flags live only
   * here, never in UI files.
   */
  buildCommand(
    projectName: string,
    options: CreatorOptions,
    packageManager: PackageManager,
    parentDirectory: string,
  ): CommandDefinition;
};
