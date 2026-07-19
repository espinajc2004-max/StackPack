import { z } from "zod";

/** Validates the static, serializable metadata of an integration recipe. */
export const recipeMetadataSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  recipeVersion: z.number().int().positive(),
  name: z.string().min(1),
  category: z.enum(["routing", "state-management", "data-fetching", "forms-validation", "testing"]),
  status: z.enum(["stable", "experimental", "deprecated"]),
  officialSource: z.object({
    documentationUrl: z.string().url(),
    lastVerifiedAt: z.string(),
  }),
  requires: z.array(z.string()).default([]),
  runsAfter: z.array(z.string()).default([]),
  conflictsWith: z.array(z.string()).default([]),
});

export type RecipeMetadata = z.infer<typeof recipeMetadataSchema>;
