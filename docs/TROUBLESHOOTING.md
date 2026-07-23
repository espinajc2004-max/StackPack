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
- recognized integrations are saved as integrations;
- the version ranges found in the source project are saved as overrides, so a
  scanned preset does not silently replace them with a recipe's `latest`;
- all other portable npm dependencies are saved as custom packages;
- local paths, Git URLs, workspace references, malformed names, and other
  non-portable specifiers are reported and skipped instead of making the whole
  preset fail validation.

The dashboard currently permits one integration in most categories. If a
scanned project contains multiple integrations from the same single-choice
category, StackPack keeps the first recognized integration and preserves the
others as custom packages. The scan output reports this conversion.

Presets are based on `package.json`, which describes the intended project
stack. A package present only in `node_modules` is intentionally ignored, and
a package missing from `package.json` because an earlier install failed cannot
be inferred reliably.
