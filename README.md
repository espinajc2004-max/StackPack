# StackPack

Build your stack once. Reuse it anywhere.

StackPack is a local-first, privacy-focused CLI for creating, saving, managing, and installing reusable JavaScript/TypeScript development stacks. It is not a package manager — it is an interactive **Stack Recipe Engine** that knows which packages belong together, which questions to ask, which config files to generate, and which scripts to add.

Everything stays on your machine: no account, no cloud, no telemetry. The only network requests are npm registry checks and package installation.

## Usage

```bash
stackpack                    # interactive main menu
stackpack create             # build a preset interactively (--local for project-scoped)
stackpack install <preset>            # existing project → installs here; otherwise asks a project name
stackpack install <preset> my-app     # create ./my-app and install into it
stackpack install <preset> --dry-run --package-manager pnpm --yes
stackpack list               # list saved presets
stackpack show <preset>      # full preset details
stackpack edit <preset>      # edit a saved preset
stackpack duplicate <preset> # copy under a new name
stackpack delete <preset>    # delete (a backup copy is kept)
stackpack export <preset>    # write <name>.stackpack.json for sharing
stackpack import <file>      # import a shared preset
stackpack scan               # detect this project's stack, save it as a preset
stackpack doctor             # health-check your setup and presets
```

## How it works

**Recipes, not hardcoded stacks.** Each framework or tool is a declarative recipe (`src/recipes/`) with conditional rules — one Express recipe produces both the JavaScript and TypeScript variants, one React recipe handles Vite, React Compiler, and language differences. The engine (`src/engine/resolve.ts`) turns recipes + your answers into an installation plan: dependencies, devDependencies, generated files, and scripts. Adding a new tool means adding a recipe and a menu option, not touching the engine.

**Create flow** asks, in order: language → **frontend** (React, Vue, Next.js) → **backend** (Express, NestJS, Fastify, Hono) → **ORM** (Drizzle, Prisma) → framework-specific questions (build tool, React Compiler, database driver…) → feature choices scoped to what you picked (routing, state, data fetching, forms, validation, testing) → curated extras → custom npm packages (verified against the registry, latest by default) → optional version pinning → review screen → save. Picking both a frontend and a backend produces a fullstack preset.

**Install flow**: if the current directory already has a `package.json`, StackPack installs into it; otherwise it asks for a project name and creates the folder + `package.json` for you. A full final review (every package, file, and script) is shown before anything is installed. It detects the package manager (packageManager field, then lockfiles — with a prompt when lockfiles conflict), previews the exact commands on request, never overwrites existing files or scripts without asking, and reports exactly what it did.

## Storage

- Global presets: `~/.stackpack/presets/` (`%USERPROFILE%\.stackpack\presets` on Windows)
- Project-local presets: `./.stackpack/` — commit these to share with your team
- Deleted presets are backed up to `~/.stackpack/backups/` first
- Registry lookups are cached in `~/.stackpack/cache/`
- Override the root with the `STACKPACK_HOME` environment variable

Presets are plain declarative JSON, validated with Zod on every load and import. File paths inside presets must be relative and may not traverse outside the project; imported presets can never execute code.

## Development

```bash
npm install
npm run dev -- <command>   # run from source (tsx)
npm run build              # compile to dist/
npm test                   # vitest (70 tests)
```

## Roadmap

- Config-file merging for existing projects (currently: ask before replacing)
- More recipes (Svelte, Tailwind config, ESLint everywhere)
- `stackpack scan` → "add missing tools" flow
- Community recipe sharing
