# Changelog

All notable changes to StackPack are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.3.1] - 2026-07-20

### Added

- Uninstall section in the README: how to remove the global command, clean up the `~/.stackpack` presets folder, and a note that created projects are never affected.
- `stackpack new` now warns and asks for confirmation when run inside an existing project (a folder that already has a `package.json`), so nested projects are never created by accident.

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
