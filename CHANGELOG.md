# Changelog

All notable changes to StackPack are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [0.3.5] - 2026-07-23

### Added

- Preset saving now offers a grouped dependency picker, so scanned runtime and
  development packages can be selectively included instead of automatically
  saving every package. `--all-packages` and `--integrations-only` provide
  non-interactive choices.
- Detected integrations can now be deselected before package selection. Their
  installed packages return to the ordinary package picker, and
  `--exclude-integration <ids...>` supports repeatable automation.
- Automated coverage now verifies that an additional npm package survives setup
  selection, preset serialization, preset loading, dependency planning, and
  installation planning for both runtime and development dependencies.
- A release matrix now validates all 23 recipes across their supported
  framework and language shapes, plus creator, installer, and official
  initializer command contracts for npm, pnpm, yarn, and bun.
- `stackpack --help` now includes ready-to-copy examples for project creation,
  adding and scanning integrations, preset save/apply flows, express install,
  dry runs, and every preset-management command.

### Changed

- Full-project scans now preserve detected integration version ranges as preset
  overrides and preview the packages that can be reproduced.
- Scan and save now share one validated classification path. Non-portable
  dependency specifiers are reported and skipped, and same-category integration
  collisions are preserved as custom packages.
- The custom-package dashboard is now labeled **Additional npm Packages** and
  explains accepted input, runtime versus development dependencies, install-only
  behavior, review and installation behavior, and automatic preset persistence.

### Fixed

- Package installation retries transient network failures such as `ECONNRESET`
  up to three times with backoff while deterministic errors still fail fast.
- Scanning a large project no longer forces all detected dependencies, including
  downloaded UI component packages, into the saved preset.
- Packages belonging to an excluded detected integration are no longer silently
  retained as that integration; they become individually selectable packages.
- The Vitest integration now creates a passing smoke test, so its generated
  `test` script no longer exits with "No test files found" immediately after
  installation.
- Post-install verification now fails when an official initializer exits
  without leaving a detectable integration, preventing an aborted shadcn or
  Playwright setup from being reported as successfully installed.

## [0.3.4] - 2026-07-20

### Added

- Automated releases: pushing a version tag now runs the full check suite in GitHub Actions and publishes to npm with provenance (trusted publishing, no tokens).

## [0.3.3] - 2026-07-20

### Added

- Dashboard project inventory: category rows now show what the project already has installed (name, version, partial-setup warning), separate from this session's picks.
- `stackpack install <preset> [project-name]` (alias `i`): express mode — create a project from a saved preset in one shot, with the review screen as the single decision point.
- `stackpack presets edit <name>` and an "Edit this preset" option in the presets browser: change a preset's integrations in the dashboard and save back to the same file, without creating or touching any project.
- Tests covering paths with spaces and unicode characters (project detection, preset store, backups, path-traversal guards).

### Changed (requirements)

- Node.js 22 or newer is now required (was 18.17). The `execa` dependency uses `Set.union`, which does not exist before Node 22, and Node 20 reached end of life in April 2026. CI now tests Node 22 and 24.

### Fixed

- CI on Windows: a `.gitattributes` file now forces LF line endings on checkout, so `prettier --check` no longer fails on Windows runners.

## [0.3.2] - 2026-07-20

### Added

- `stackpack new` now warns and asks for confirmation when run inside an existing project (a folder that already has a `package.json`), so nested projects are never created by accident.
- Update notice in the interactive menu: an anonymous, once-per-day registry check shows when a newer version exists (never auto-updates, fails silently offline, opt out with `STACKPACK_NO_UPDATE_CHECK`).

### Changed

- Save-and-load presets: installing from a preset without changing anything no longer asks to save again — it finishes with "good to go". If the setup was modified after loading, the save prompt says so and pre-fills the preset name for easy updating.
- `stackpack new` ends with a "Next steps" note (`cd <project>` + dev command).

### Fixed

- `stackpack --version` now reports the real version (0.3.1 still printed 0.3.0).

## [0.3.1] - 2026-07-20

### Added

- Uninstall section in the README: how to remove the global command, clean up the `~/.stackpack` presets folder, and a note that created projects are never affected.

## [0.3.0] - 2026-07-19

Complete rewrite around the official-first integration builder design.

### Added

- Official base creators: React with Vite (`create-vite`) and Next.js (`create-next-app`).
- Post-creation project detection (framework, build tool, language, router type, package manager) that inspects the real generated files.
- Category-based, jumpable integration dashboard with persistent in-memory selections.
- Curated recipes: React Router, Zustand, Redux Toolkit, TanStack Query (+ Devtools), React Hook Form with Zod, Vitest with React Testing Library, Playwright (official initializer).
- UI Components category: shadcn/ui via the official CLI (with Tailwind CSS and `@/*` alias setup on Vite projects), plus Radix UI, Base UI, and React Aria.
- Database / ORM category (install only): Prisma, Drizzle ORM, TypeORM, Sequelize, MikroORM.
- Additional install-only recipes: Jotai, MobX, Valtio, XState, Axios, Valibot, ArkType.
- Typed custom packages are remembered locally and can be re-added or deleted in later setups.
- Preset browser in the main menu with a direct "Delete a preset" option and per-preset detail view.
- Esc inside dashboard sub-screens goes back one level instead of cancelling the whole setup.
- Custom npm package input with strict specifier validation (package-only installs).
- Package version editor (versions, ranges, and npm dist-tags).
- Installation plan review separating StackPack's exact changes from delegated official-tool changes; dry-run mode.
- Dependency resolution with dedup, dependency-type conflict handling, version-conflict detection, and user overrides.
- Integration ordering (`requires` / `runsAfter` / `conflictsWith`) with cycle detection.
- Safe execution flow: backups, official installs, official initializers, mandatory rescan, safe file writes, structured `package.json` edits.
- File and script conflict resolution (keep / replace after backup / rename / alternate script name).
- Post-install verification (packages, files, config parsing, optional typecheck/build runs) with restore-from-backup.
- Local-only presets (global `~/.stackpack/presets` and project-local `.stackpack/`), atomic writes, schema-versioned validation, `save` / `apply` / `presets list|show|delete`, `new --preset`.
- Package manager detection from lockfiles with explicit user choice on ambiguity (npm, pnpm, yarn, bun).
- Git safety warning for uncommitted changes.

### Removed

- The previous preset-based stack installer (backend/frontend recipe catalog, export/import commands).
