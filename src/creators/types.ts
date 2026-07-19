import type { CommandDefinition, PackageManager } from "../package-manager/types.js";

export type CreatorId = "vite-react" | "next";

export type CreatorOptions = {
  language: "typescript" | "javascript";
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
