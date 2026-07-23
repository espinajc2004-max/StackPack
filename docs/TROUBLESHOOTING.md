# Troubleshooting installs and project scans

## `ECONNRESET`, `network aborted`, or registry timeouts

These messages mean the package manager's connection to the registry was
interrupted while packages were downloading. They are transport failures, not
dependency-version conflicts. Common causes include an unstable connection, a
VPN or firewall closing a long-lived request, a temporary registry/CDN issue,
or an incorrectly configured proxy.

StackPack retries recognized transient network failures up to three times with
a short backoff. It does not retry deterministic failures such as peer
dependency conflicts, invalid package names, permission errors, or failed
official initializers.

If all retries fail:

1. Check the registry from the same terminal with `npm ping` (or the matching
   package-manager command).
2. Inspect `npm config get registry`, `npm config get proxy`, and
   `npm config get https-proxy`. Do not paste authentication tokens into bug
   reports.
3. Run StackPack again after connectivity is stable. The package manager will
   reconcile an existing `node_modules` directory and lockfile.
4. Inspect `.stackpack/backups/<operation-id>/operation.json` to see which
   commands completed. StackPack backs up project files, but it does not copy
   or roll back `node_modules`.

StackPack installs regular dependencies and development dependencies in
separate package-manager passes so each group is written to the correct
`package.json` section. A failure in the second pass can therefore leave the
first group installed; the operation record makes that state explicit.

## Scanning a project into a preset

`stackpack scan` and `stackpack save <name>` use the same classification logic:

- official creator/scaffold packages are omitted because a new base project
  already includes them;
- recognized integrations are presented first and only the selected ones are
  saved as integrations;
- the version ranges found in the source project are saved as overrides, so a
  scanned preset does not silently replace them with a recipe's `latest`;
- all other portable npm dependencies are presented in runtime and development
  groups, and only the packages the user selects are saved as custom packages;
- local paths, Git URLs, workspace references, malformed names, and other
  non-portable specifiers are reported and skipped instead of making the whole
  preset fail validation.

The dashboard currently permits one integration in most categories. If a
scanned project contains multiple integrations from the same single-choice
category, StackPack keeps the first recognized integration and preserves the
others as selectable custom packages. The scan output reports this conversion.

The package picker starts with nothing selected, making a small reusable preset
easy to create. Choose **Save all packages** for the previous behavior. CLI
automation can bypass the prompt with `stackpack save <name> --all-packages` or
save only recognized integrations with
`stackpack save <name> --integrations-only`.

When a detected integration is deselected, its installed packages are moved
into the ordinary package picker. This keeps the scan lossless while allowing a
user to save one package without saving the integration recipe and its setup
behavior. Automation can exclude integrations by id, for example
`stackpack save <name> --all-packages --exclude-integration shadcn`.

Presets are based on `package.json`, which describes the intended project
stack. A package present only in `node_modules` is intentionally ignored, and
a package missing from `package.json` because an earlier install failed cannot
be inferred reliably.

## Real-project validation: au-ggregates

### Bug discovered

The real project scan detected React Hook Form with Zod, Prisma, and shadcn/ui.
The first selective-save implementation allowed individual dependencies to be
removed but always saved all three detected integrations. A user trying to
exclude UI setup could remove the individual Radix packages while shadcn/ui
still remained in the preset and would run its official initializer in a new
project.

### Cause

Integration classification happened before package selection and the resulting
integration selection was treated as mandatory. The dependency picker only
received packages that were not owned by those integrations.

### Fix

Preset saving now asks which detected integrations to include before showing
the package picker. When an integration is deselected, the scanner recomputes
ownership and returns its installed packages to the selectable package list.
The `--exclude-integration <ids...>` option provides the same behavior for
repeatable CLI tests and automation.

### Added behavior

The save flow now has two explicit selection stages:

1. Select detected integrations.
2. Select any remaining runtime and development packages.

The resulting review note reports only selected integrations and the number of
remaining portable packages available for the preset.

### Validation result

The source project contained three detected integrations and 68 other portable
packages:

- React Hook Form with Zod
- Prisma
- shadcn/ui

A real preset was saved with shadcn/ui excluded, the first two integrations
included, and no other packages selected. The preset retained five source
version ranges for React Hook Form, Zod, the Hook Form resolvers, Prisma Client,
and the Prisma CLI.

That preset was applied to a fresh official Next.js TypeScript project. The
package installation completed in two passes, StackPack verification passed,
and `next build` completed successfully. A scan of the generated project found
only React Hook Form with Zod and Prisma, reported zero other portable packages,
and confirmed that neither shadcn/ui nor Radix UI was installed.

npm resolved the saved semver ranges to the newest compatible releases during
installation. For example, Prisma `^7.2.0` resolved to `7.9.0`. This is expected
semver behavior: the preset preserves the accepted range, while npm chooses the
current matching version at install time.

## Additional npm package lifecycle

### Problem discovered

The custom-package screen used `sonner@latest` as its only example and labeled
the category "Custom Packages." This made the feature look Sonner-specific and
did not clearly explain that it accepts any npm package missing from the curated
integration categories. The dependency-type question also exposed raw manifest
field names without explaining their effect.

### Fix

The dashboard now calls the category **Additional npm Packages** and describes
its purpose before asking for input. The input shows multiple accepted forms,
including unversioned, versioned, and scoped packages. The dependency choice is
presented as **Runtime dependency** or **Development dependency**, with the
matching `package.json` section explained in the hint.

### Added behavior

After a package is selected, StackPack explicitly states that:

1. The package is install-only and receives no invented configuration.
2. It is included in the current setup's review and installation.
3. It is included automatically if the completed setup is saved as a preset.
4. It remains available as a local suggestion for later setups.

The package addition logic is shared with tests, so validation, duplicate-name
protection, dependency type, preset serialization, preset loading, and install
planning follow one path.

### Validation result

The full lifecycle was tested with `nanoid`, which is not a curated StackPack
integration:

1. `nanoid@^5.1.5` was added as a runtime dependency through the same helper used
   by the dashboard.
2. A preset was saved with no curated integrations and `nanoid` as its only
   custom dependency.
3. The preset was loaded into a fresh official Next.js TypeScript project.
4. The installation plan identified `nanoid` as requested by `custom package`
   and ran `npm install --save nanoid@^5.1.5`.
5. `npm ls nanoid --depth=0` confirmed `nanoid@5.1.16` was installed.
6. A runtime ESM import generated a valid 21-character Nano ID.
7. `next build` completed successfully.
8. A final StackPack scan reported no curated integrations and exactly one
   other portable package: `nanoid`.

This verifies that a package entered manually is retained in the saved preset
and installed when that preset is used for a new project.

## Vitest integration exits with no test files

### Problem discovered

A full fresh-project test of every curated integration found that the Vitest
recipe installed and configured Vitest correctly but did not create a test
file. Running the generated `npm test -- --run` command therefore exited with
code 1 and reported `No test files found`.

### Fix

The recipe now creates `src/test/stackpack.smoke.test.tsx` for React component
testing or `src/test/stackpack.smoke.test.ts` for utility testing. The component
version renders a button with React Testing Library and verifies the generated
JSDOM and jest-dom setup. The utility version verifies the basic Vitest runner.
Both variants import their Vitest APIs explicitly so TypeScript project builds
do not depend on global test types.

### Validation

The generated component smoke test is run in the release end-to-end Vite
project with `npm test -- --run`. The project is also compiled with
`tsc -b && vite build`, which type-checks the generated test before the
production bundle is created.

## Official initializer exits without installing

### Problem discovered

During unattended release testing, the shadcn CLI displayed its first-run
`components.json` question, received no terminal input, and exited with code 0
without creating the file. StackPack previously treated any zero exit code from
an official initializer as success. This could produce a false successful
result after an initializer was aborted or ended without its expected output.

### Fix

Post-install verification now runs the selected recipe's detection logic for
every official initializer. shadcn must be detectable through
`components.json`; Playwright must be detectable through its package or
configuration. A missing or partial result is reported as a failed verification
even if the external CLI returned exit code 0.

### Validation

Regression tests cover both sides of the result: a simulated zero exit without
`components.json` fails, while the same project passes after that initializer
output exists. The real shadcn and Playwright initializers were then run in the
release projects and both projects completed their production builds.
