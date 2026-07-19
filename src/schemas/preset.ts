import { z } from "zod";
import validatePackageName from "validate-npm-package-name";
import { parseVersionSpec } from "../utils/versions.js";
import { validatePresetName } from "../utils/names.js";

export const PRESET_SCHEMA_VERSION = 1;

const versionValueSchema = z
  .string()
  .refine((value) => parseVersionSpec(value) !== null, "Invalid npm version, range, or tag.");

const packageNameSchema = z
  .string()
  .refine((value) => validatePackageName(value).validForNewPackages, "Invalid npm package name.");

const packageMapSchema = z.record(packageNameSchema, versionValueSchema);

export const presetSchema = z.object({
  schemaVersion: z.literal(PRESET_SCHEMA_VERSION),
  name: z.string().refine((value) => validatePresetName(value).ok, "Unsafe preset name."),
  displayName: z.string().max(120).optional(),
  scope: z.enum(["global", "local"]),
  createdAt: z.string(),
  updatedAt: z.string(),
  base: z.object({
    // "vite-react" is the pre-rename id; normalize it so old presets load.
    creator: z
      .enum(["vite", "next", "vite-react"])
      .transform((value) => (value === "vite-react" ? ("vite" as const) : value)),
    language: z.enum(["typescript", "javascript"]),
    creatorOptions: z.record(z.string(), z.unknown()).default({}),
  }),
  project: z.object({
    framework: z.enum(["react", "next"]),
    buildTool: z.enum(["vite", "next"]),
    language: z.enum(["typescript", "javascript"]),
  }),
  integrations: z
    .array(
      z.object({
        id: z.string().regex(/^[a-z0-9-]+$/),
        recipeVersion: z.number().int().positive(),
        options: z.record(z.string(), z.unknown()).default({}),
      }),
    )
    .default([]),
  customPackages: z
    .object({
      dependencies: packageMapSchema.default({}),
      devDependencies: packageMapSchema.default({}),
    })
    .default({ dependencies: {}, devDependencies: {} }),
  versionOverrides: packageMapSchema.default({}),
});

export type Preset = z.infer<typeof presetSchema>;
