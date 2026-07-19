import { z } from "zod";

export const frameworkSchema = z.enum(["react", "next", "unknown"]);
export const buildToolSchema = z.enum(["vite", "next", "unknown"]);
export const languageSchema = z.enum(["typescript", "javascript", "unknown"]);
export const packageManagerSchema = z.enum(["npm", "pnpm", "yarn", "bun"]);
export const routerTypeSchema = z.enum(["app-router", "pages-router", "client-router", "unknown"]);
export const detectionStateSchema = z.enum([
  "detected",
  "partially-detected",
  "ambiguous",
  "unsupported",
]);

export const packageJsonSchema = z
  .object({
    name: z.string().optional(),
    version: z.string().optional(),
    scripts: z.record(z.string(), z.string()).optional(),
    dependencies: z.record(z.string(), z.string()).optional(),
    devDependencies: z.record(z.string(), z.string()).optional(),
  })
  .loose();

export const projectContextSchema = z.object({
  rootDirectory: z.string(),
  framework: frameworkSchema,
  buildTool: buildToolSchema,
  language: languageSchema,
  packageManager: packageManagerSchema,
  /** All package managers whose lockfiles were found; >1 means ambiguous. */
  packageManagerCandidates: z.array(packageManagerSchema),
  routerType: routerTypeSchema.optional(),
  detection: detectionStateSchema,
  packageJson: packageJsonSchema,
  detectedFiles: z.array(z.string()),
  installedPackages: z.record(z.string(), z.string()),
});

export type Framework = z.infer<typeof frameworkSchema>;
export type BuildTool = z.infer<typeof buildToolSchema>;
export type Language = z.infer<typeof languageSchema>;
export type RouterType = z.infer<typeof routerTypeSchema>;
export type DetectionState = z.infer<typeof detectionStateSchema>;
export type PackageJson = z.infer<typeof packageJsonSchema>;
export type ProjectContext = z.infer<typeof projectContextSchema>;
