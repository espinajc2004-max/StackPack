import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { operationSummarySchema, type OperationSummary } from "../schemas/operation.js";
import { getProjectBackupsDir } from "./paths.js";

export type Operation = {
  id: string;
  dir: string;
  filesDir: string;
};

export async function createOperation(projectRoot: string): Promise<Operation> {
  const id = `${new Date().toISOString().replace(/[:.]/g, "-")}-${crypto.randomUUID().slice(0, 8)}`;
  const dir = path.join(getProjectBackupsDir(projectRoot), id);
  const filesDir = path.join(dir, "files");
  await fs.mkdir(filesDir, { recursive: true });
  return { id, dir, filesDir };
}

export async function writeOperationSummary(
  operation: Operation,
  summary: OperationSummary,
): Promise<void> {
  const validated = operationSummarySchema.parse(summary);
  await fs.writeFile(
    path.join(operation.dir, "operation.json"),
    JSON.stringify(validated, null, 2) + "\n",
    "utf8",
  );
}
