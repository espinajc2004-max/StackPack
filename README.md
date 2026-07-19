# StackPack

A local-first, privacy-focused, terminal-based integration builder for JavaScript and TypeScript projects.

StackPack creates projects with the **official** tools (`create-vite`, `create-next-app`), then opens a category-based integration dashboard where you pick routing, state management, data fetching, forms, testing, and custom packages. Everything is reviewed as one installation plan before a single package is installed.

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

| Category             | Integration                            | Method            |
| -------------------- | -------------------------------------- | ----------------- |
| Routing              | React Router (React + Vite only)       | package install   |
| State Management     | Zustand                                | package install   |
| State Management     | Redux Toolkit (+ optional store files) | package install   |
| Data Fetching        | TanStack Query (+ optional Devtools)   | package install   |
| Forms and Validation | React Hook Form with Zod               | package install   |
| Testing              | Vitest with React Testing Library      | packages + config |
| Testing              | Playwright                             | official init CLI |

Plus custom npm packages (installed only, never auto-configured).

Framework-specific filtering applies automatically — e.g. React Router is hidden on Next.js projects because Next.js provides routing.

## Commands

```bash
stackpack                          # interactive main menu
stackpack new <project-name>       # create a project with an official creator
stackpack new my-app --preset jc-react-stack
stackpack add                      # add integrations to the current project
stackpack add --dry-run            # full plan, zero changes
stackpack add --package-manager pnpm
stackpack scan                     # detect stack + installed integrations
stackpack save <name> [--local|--global]
stackpack apply <name> [--dry-run] # apply a preset to the current project
stackpack presets list
stackpack presets show <name>
stackpack presets delete <name>
stackpack --no-color
```

## The dashboard

After the base project exists, StackPack does not walk you through a fixed wizard. It opens a jumpable dashboard: enter any category, select or remove an integration, come back later, edit versions, and review only when you are ready. Selections persist in memory until you install or cancel.

## Privacy model

StackPack requires **no sign-up, no login, no server, no telemetry**. Presets are plain JSON stored on your device:

- Global: `~/.stackpack/presets/<name>.json`
- Project-local (committable): `<project>/.stackpack/<name>.json`

Presets never contain shell commands, executable code, absolute paths, credentials, or `.env` values — the schema rejects anything unexpected. Internet access is only needed to run official creators/initializers and install packages.

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
- No ORM/auth integrations, no monorepo automation, no cloud sync, no marketplace (by design, for now).

## Development

```bash
npm install
npm run dev          # run the CLI from source
npm run check        # typecheck + lint + format check + tests + build
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the contribution process.

## License

[MIT](LICENSE)
