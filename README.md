# StackPack

**A local-first, privacy-focused, terminal-based integration builder for JavaScript and TypeScript projects.**

Official tooling first · Real-world integrations · Presets stay on your device

[![CI](https://github.com/espinajc2004-max/StackPack/actions/workflows/ci.yml/badge.svg)](https://github.com/espinajc2004-max/StackPack/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/stackpack-cli.svg)](https://www.npmjs.com/package/stackpack-cli)
[![node](https://img.shields.io/node/v/stackpack-cli.svg)](https://nodejs.org)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

---

## Quick start

Run it anywhere, no install needed:

```bash
npx stackpack-cli
```

Or install it once and use `stackpack` as a system-wide command:

```bash
npm install -g stackpack-cli
stackpack
```

Open a terminal in any folder, type `stackpack`, and the interactive menu takes it from there — create a project, pick integrations, review the plan, install.

## Uninstall

If you installed StackPack globally and no longer want it:

```bash
npm uninstall -g stackpack-cli
```

That removes the `stackpack` command from your system. (If you only ever used `npx stackpack-cli`, there is nothing to uninstall — npx leaves nothing installed.)

StackPack also keeps your saved presets in a small local folder. If you want a complete cleanup, delete it too:

```bash
# Windows
rmdir /s /q "%USERPROFILE%\.stackpack"

# macOS / Linux
rm -rf ~/.stackpack
```

Projects you created with StackPack are never touched by uninstalling — they are normal projects that belong entirely to you.

## How it works

StackPack creates projects with the **official** tools (`create-vite`, `create-next-app`), then opens a category-based integration dashboard where you pick routing, state management, data fetching, forms, UI components, ORMs, testing, and custom packages. Everything is reviewed as one installation plan before a single package is installed.

```text
Run StackPack
→ Choose project type and language
→ Official creator runs
→ StackPack inspects what was actually generated
→ Jump between integration categories
→ Review the full plan
→ Install with official methods
→ Verify
→ Optionally save the setup as a local preset
```

## Official-first installation policy

Every integration uses the most official installation method available, in this priority order:

1. **Official project creator** — e.g. `create-vite`, `create-next-app`. StackPack never recreates official templates by hand.
2. **Official initializer CLI** — e.g. Playwright's `npm init playwright@latest`, which runs interactively and controls its own setup. StackPack rescans the project afterwards.
3. **Official documented package installation** — e.g. Zustand, Redux Toolkit (`@reduxjs/toolkit` + `react-redux`), TanStack Query, React Hook Form with Zod (`react-hook-form` + `zod` + `@hookform/resolvers`).
4. **Package-only installation** — for custom packages without a verified recipe. StackPack tells you clearly that no automatic configuration will happen; it never invents configuration from a package name.

## Supported base creators

- React with Vite (official `create-vite`)
- Next.js (official `create-next-app`)

Existing React + Vite and Next.js projects are detected too (`stackpack add`, `stackpack scan`).

## Curated integrations

| Category             | Integration                                       | Method            |
| -------------------- | ------------------------------------------------- | ----------------- |
| Routing              | React Router (React + Vite only)                  | package install   |
| State Management     | Zustand                                           | package install   |
| State Management     | Redux Toolkit (+ optional store files)            | package install   |
| State Management     | Jotai, MobX, Valtio, XState                       | install only      |
| Data Fetching        | TanStack Query (+ optional Devtools)              | package install   |
| Data Fetching        | Axios                                             | install only      |
| Forms and Validation | React Hook Form with Zod                          | package install   |
| Forms and Validation | Valibot, ArkType                                  | install only      |
| UI Components        | shadcn/ui (Tailwind + alias setup on Vite)        | official CLI      |
| UI Components        | Radix UI, Base UI, React Aria                     | package install   |
| Database / ORM       | Prisma, Drizzle ORM, TypeORM, Sequelize, MikroORM | install only      |
| Testing              | Vitest with React Testing Library                 | packages + config |
| Testing              | Playwright                                        | official init CLI |

"Install only" means StackPack installs the official packages and stops — you write the setup files yourself, and the review says so explicitly.

Plus custom npm packages (installed only, never auto-configured). Custom packages you type in are remembered locally so future setups can re-add them in one step.

Framework-specific filtering applies automatically — e.g. React Router is hidden on Next.js projects because Next.js provides routing.

## Commands

```bash
stackpack                          # interactive main menu
stackpack new <project-name>       # create a project with an official creator
stackpack new my-app --preset jc-react-stack
stackpack install <preset> [name]  # express mode: whole stack in one shot
stackpack i <preset> [name]        # same, shorter
stackpack add                      # add integrations to the current project
stackpack add --dry-run            # full plan, zero changes
stackpack add --package-manager pnpm
stackpack scan                     # detect stack + installed integrations
stackpack save <name> [--local|--global]
stackpack apply <name> [--dry-run] # apply a preset to the current project
stackpack presets list
stackpack presets show <name>
stackpack presets edit <name>      # swap integrations, save back — no project touched
stackpack presets delete <name>
stackpack --no-color
```

## The dashboard

After the base project exists, StackPack does not walk you through a fixed wizard. It opens a jumpable dashboard: enter any category, select or remove an integration, come back later, edit versions, and review only when you are ready. Selections persist in memory until you install or cancel. Pressing Esc inside a category goes back one screen without losing your selections; only Esc at the dashboard itself cancels the setup.

## Privacy model

StackPack requires **no sign-up, no login, no server, no telemetry**. Presets are plain JSON stored on your device:

- Global: `~/.stackpack/presets/<name>.json`
- Project-local (committable): `<project>/.stackpack/<name>.json`

Presets never contain shell commands, executable code, absolute paths, credentials, or `.env` values — the schema rejects anything unexpected. Internet access is only needed to run official creators/initializers and install packages.

One small exception, in the open: the interactive menu checks the npm registry (at most once per day, cached locally) to tell you when a newer StackPack version exists. It is an anonymous read-only request that sends nothing about you or your projects, never updates anything by itself, fails silently offline, and can be disabled completely by setting the `STACKPACK_NO_UPDATE_CHECK` environment variable.

## Safety

- Nothing is installed before you confirm the reviewed plan.
- Backups of files StackPack will modify go to `<project>/.stackpack/backups/<operation-id>/` before any change.
- Existing files and `package.json` scripts are never silently overwritten — you choose keep/replace/rename per conflict.
- `package.json` edits use structured JSONC editing, not string replacement.
- All generated paths are checked to stay inside the project root.
- Commands run without a shell; executable and arguments are always passed separately.
- Uncommitted Git changes trigger a warning first (Git itself is optional).

## Limitations

- Curated recipes cover React + Vite and Next.js only.
- StackPack cannot predict every file an official initializer creates; the review says so explicitly and the project is rescanned afterwards.
- Rollback is best effort: backed-up files can be restored, but package-manager changes are not automatically reversed.
- ORM integrations install dependencies only — schema, config, and driver choices stay in your hands.
- No auth integrations, no monorepo automation, no cloud sync, no marketplace (by design, for now).

## Development

```bash
npm install
npm run dev          # run the CLI from source
npm run check        # typecheck + lint + format check + tests + build
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the contribution process.

## License

[MIT](LICENSE)
