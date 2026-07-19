import { z } from "zod";

export const operationSummarySchema = z.object({
  operationId: z.string(),
  startedAt: z.string(),
  finishedAt: z.string().optional(),
  integrations: z.array(z.string()),
  filesBackedUp: z.array(z.string()),
  commandsRun: z.array(z.string()),
  status: z.enum(["started", "completed", "failed", "cancelled"]),
});

export type OperationSummary = z.infer<typeof operationSummarySchema>;
