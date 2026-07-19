import fs from "node:fs/promises";
import path from "node:path";
import { parse as parseJsonc, type ParseError } from "jsonc-parser";
import type { InstallationPlan } from "./build-plan.js";
import type { ProjectContext } from "../schemas/project-context.js";
import type { CommandRunner } from "../package-manager/execute.js";
import { formatCommand } from "../package-manager/types.js";

export type VerificationCheck = {
  name: string;
  status: "passed" | "failed" | "skipped";
  detail?: string;
};

export type VerifyOptions = {
  runner: CommandRunner;
  /** Run available typecheck/build scripts (slower, most thorough). */
  runCommands: boolean;
};

/**
 * Verifies the project after installation. Only runs scripts that actually
 * exist in package.json; never assumes every project has build or typecheck.
 */
export async function verifyProject(
  context: ProjectContext,
  plan: InstallationPlan,
  options: VerifyOptions,
): Promise<VerificationCheck[]> {
  const checks: VerificationCheck[] = [];
  const root = context.rootDirectory;
  const installed = context.installedPackages;

  const expectedPackages = [...plan.dependencies, ...plan.devDependencies].map((p) => p.name);
  const missingPackages = expectedPackages.filter((name) => !(name in installed));
  checks.push(
    missingPackages.length === 0
      ? { name: "Expected packages found", status: "passed" }
      : {
          name: "Expected packages found",
          status: "failed",
          detail: `Missing from package.json: ${missingPackages.join(", ")}`,
        },
  );

  const missingFiles: string[] = [];
  for (const file of plan.filesToCreate) {
    try {
      await fs.access(path.join(root, file.path));
    } catch {
      missingFiles.push(file.path);
    }
  }
  checks.push(
    missingFiles.length === 0
      ? { name: "Expected files exist", status: "passed" }
      : {
          name: "Expected files exist",
          status: "failed",
          detail: `Missing: ${missingFiles.join(", ")} (existing files may have been kept instead)`,
        },
  );

  const configFiles = ["package.json", "tsconfig.json"].filter((file) =>
    context.detectedFiles.includes(file),
  );
  let configsOk = true;
  const configProblems: string[] = [];
  for (const file of configFiles) {
    try {
      const raw = await fs.readFile(path.join(root, file), "utf8");
      const errors: ParseError[] = [];
      parseJsonc(raw, errors, { allowTrailingComma: true });
      if (errors.length > 0) {
        configsOk = false;
        configProblems.push(file);
      }
    } catch {
      configsOk = false;
      configProblems.push(file);
    }
  }
  checks.push(
    configsOk
      ? { name: "Configuration files parsed", status: "passed" }
      : {
          name: "Configuration files parsed",
          status: "failed",
          detail: `Could not parse: ${configProblems.join(", ")}`,
        },
  );

  const scripts = context.packageJson.scripts ?? {};
  for (const scriptName of ["typecheck", "build"]) {
    const label = scriptName === "typecheck" ? "TypeScript check" : "Production build";
    if (!(scriptName in scripts)) {
      checks.push({ name: label, status: "skipped", detail: `No "${scriptName}" script.` });
      continue;
    }
    if (!options.runCommands) {
      checks.push({ name: label, status: "skipped", detail: "Command checks were not requested." });
      continue;
    }
    const cmd = {
      command: context.packageManager,
      args: ["run", scriptName],
      cwd: root,
    };
    const result = await options.runner(cmd);
    checks.push(
      result.exitCode === 0
        ? { name: label, status: "passed" }
        : {
            name: label,
            status: "failed",
            detail: `${formatCommand(cmd)} exited with code ${result.exitCode}.`,
          },
    );
  }

  return checks;
}
