import path from "node:path";
import { z } from "zod";
import { NPM_NAME_PATTERN } from "../utils/package-parser.js";
import { PRESET_NAME_PATTERN } from "../utils/sanitize-name.js";

export const PRESET_SCHEMA_VERSION = 1;

const packageNameSchema = z
  .string()
  .regex(NPM_NAME_PATTERN, "Not a valid npm package name");

const packageRecordSchema = z
  .record(z.string().min(1))
  .default({})
  .refine(
    (record) => Object.keys(record).every((k) => NPM_NAME_PATTERN.test(k)),
    "Contains an invalid npm package name"
  );

export const safeRelativePathSchema = z
  .string()
  .min(1)
  .refine((p) => !path.isAbsolute(p), "File paths must be relative")
  .refine(
    (p) => !p.split(/[\\/]/).includes(".."),
    "File paths may not contain '..'"
  );

export const generatedFileSchema = z.object({
  path: safeRelativePathSchema,
  content: z.string(),
});

export const environmentSchema = z.object({
  type: z.enum(["frontend", "backend", "fullstack", "general"]),
  framework: z.string().optional(),
  language: z.enum(["typescript", "javascript"]).optional(),
  buildTool: z.string().optional(),
});

export const presetNameSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(
    PRESET_NAME_PATTERN,
    "Preset names may only use lowercase letters, numbers, dots, dashes and underscores"
  );

export const presetSchema = z.object({
  schemaVersion: z.literal(PRESET_SCHEMA_VERSION),
  name: presetNameSchema,
  displayName: z.string().min(1),
  scope: z.enum(["global", "local"]).default("global"),
  createdAt: z.string(),
  updatedAt: z.string(),
  environment: environmentSchema,
  selections: z.record(z.union([z.string(), z.boolean()])).default({}),
  dependencies: packageRecordSchema,
  devDependencies: packageRecordSchema,
  recipes: z.array(z.string()).default([]),
  files: z.array(generatedFileSchema).default([]),
  scripts: z.record(z.string()).default({}),
});

export type Preset = z.infer<typeof presetSchema>;
export type GeneratedFile = z.infer<typeof generatedFileSchema>;
export type PresetEnvironment = z.infer<typeof environmentSchema>;
export { packageNameSchema };
