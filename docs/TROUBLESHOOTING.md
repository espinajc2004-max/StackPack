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
