# StackPack 0.3.5 Release Validation

Validation date: 2026-07-23

Environment:

- Windows 10.0.26220
- Node.js 22.18.0
- npm 10.9.3
- pnpm 10.32.1

Final repository gate:

- 18 Vitest files passed;
- 87 automated tests passed;
- TypeScript, ESLint, Prettier, and production CLI build passed;
- npm package dry-run reported `stackpack-cli@0.3.5`;
- StackPack's own `npm audit` reported zero vulnerabilities.

## Automated coverage

The complete repository check runs type checking, linting, formatting,
Vitest, and the production CLI build. The 0.3.5 release adds a permanent
release matrix that covers:

- all 23 registered integration recipes;
- 88 supported React/Next.js and TypeScript/JavaScript recipe plans;
- safe generated file and JSON-edit paths;
- valid dependency specifiers and conflict-free individual plans;
- npm, pnpm, yarn, and bun runtime, development, and base-install commands;
- Vite and Next.js official creator commands for every supported package
  manager and language;
- customized Next.js creator flags;
- shadcn and Playwright delegated initializer commands for every package
  manager;
- workflow examples exposed directly by `stackpack --help`;
- failed and successful post-install detection for official initializers.

The existing suite also covers project and lockfile detection, dry runs,
dependency resolution and conflicts, transient network retry, backups and
restore, file and script conflict decisions, preset storage and round trips,
full-project package classification, package selection and integration
exclusion, unsafe paths and names, unsupported projects, malformed presets,
newer preset schemas, spaces and Unicode paths, and custom-package persistence.

## Real project end-to-end validation

All release projects were created with the current official project creators
and kept under:

`C:\tmp\stackpack-035-full-e2e-20260723`

### React with Vite and npm

The official React TypeScript Vite template was created with dependency
installation deferred. Every registered recipe was then processed through
StackPack's real plan, backup, package install, file write, rescan, and
verification path.

Results:

- 23 recipe paths completed.
- 21 package or generated-file recipes used real npm installations.
- The shadcn and Playwright delegated commands were isolated for their official
  initializer runs.
- The resulting project contained 32 runtime and 14 development dependencies
  before the shadcn initializer added its own packages.
- Generated Redux, TanStack Query, UI component, shadcn, and Vitest files
  passed `tsc -b && vite build`.
- The generated Vitest smoke test passed in JSDOM.
- The real shadcn initializer created `components.json`,
  `src/components/ui/button.tsx`, and its supporting files.
- A final scan detected shadcn and the other installed integrations.

### Full scanned preset reproduction

The full Vite project was saved through the packaged CLI in three modes:

- all portable packages;
- integrations only;
- all packages with the detected Radix UI integration excluded.

Preset list and show commands displayed the expected integrations, version
overrides, runtime dependencies, and development dependencies. Excluding Radix
returned its package to the selectable package set and allowed Base UI to
occupy the UI integration slot.

The all-packages preset was applied to a second fresh official Vite TypeScript
project. StackPack restored seven curated integrations and 22 selected custom
packages, installed 29 runtime and seven development package entries, verified
the result, passed the generated Vitest smoke test, and passed the production
build. Applying the same Vite preset to a Next.js project was rejected before
installation with explicit framework and build-tool mismatch errors.

### Next.js with npm

The official Next.js TypeScript App Router template was created with dependency
installation deferred. All 21 recipes supported by Next.js completed their real
StackPack plan, install, write, rescan, and verification path. React Router and
the Vite-specific Vitest recipe were correctly unavailable.

The generated client components and other TypeScript files passed the Next.js
production build. A scan identified the installed integrations and saved an
integrations-only Next.js preset.

The real Playwright initializer installed `@playwright/test` and created
`playwright.config.ts`. Browser downloads and browser execution were omitted;
the Next.js production build passed after initialization.

### React with Vite and pnpm

A fresh official Vite TypeScript project was created with pnpm. StackPack used
real `pnpm add` and `pnpm add -D` commands for Axios, a custom `nanoid`
dependency, and the Vitest component-testing recipe.

The scan detected pnpm, Axios, Vitest, and the custom package. The generated
test passed and the production Vite build completed.

## Packaged CLI validation

The npm tarball was installed into an isolated prefix and its binary was used
for version, help, save-command help, and scan smoke tests. The CLI reported
version 0.3.5. The main help output lists copyable examples for creating,
scanning, saving, applying, and express-installing projects, plus every preset
management command and the command-specific help pattern.

Command-level validation also covered:

- all-packages, integrations-only, and integration-exclusion save modes;
- preset list and show;
- incompatible preset application;
- conflicting save flags;
- unsupported projects;
- missing presets.

Successful preset application was exercised through the same preset store,
selection restoration, plan, apply, and verify functions used by the CLI. The
interactive main-menu keystrokes were not automated because the Clack and
official initializer prompts require a real terminal.

## Defects found and fixed

### Vitest had no initial test

The original Vitest recipe created configuration and a test script but no test
file. A fresh installation therefore failed immediately with
`No test files found`. The recipe now generates a component or utility smoke
test, and both the real Vite projects and automated regression tests pass it.

### Official initializer false success

The shadcn CLI can return exit code 0 after an unattended first-run prompt
without creating `components.json`. StackPack previously trusted that exit code
and could report a false success. Verification now requires each delegated
initializer to be detectable after it exits. Real shadcn and Playwright output
and both regression states were verified.

## Security and environment notes

`npm audit` reports zero vulnerabilities for StackPack itself.

The intentionally broad fixture projects install many unrelated current
packages at once. Their audits reported:

- Vite fixture: nine moderate advisories;
- Next.js fixture: seven moderate and two high advisories, with the high
  findings attributed by npm to the direct `next` package and transitive
  `sharp`.

These findings are in the generated applications' current upstream dependency
trees rather than StackPack's package tree. They were not changed automatically
because npm's suggested fix required a semver-major dependency change.

Yarn and bun were not installed in this environment. Their creators,
installers, dev-dependency flags, and delegated initializer commands are covered
by the permanent command-contract matrix, but no real yarn or bun installation
was performed.
