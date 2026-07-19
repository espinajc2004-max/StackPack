# Contributing to StackPack

Thanks for your interest in contributing!

## Getting started

```bash
git clone <your-fork>
cd StackPack
npm install
npm run dev        # run the CLI from source (tsx)
npm run check      # typecheck + lint + format check + tests + build
```

All of `npm run check` must pass before a pull request is merged. CI runs the same steps on Linux, Windows, and macOS.

## Project principles

Please keep these in mind — pull requests that violate them will be asked to change:

- **Official-first.** Integrations must use the most official installation method available (creator > initializer > documented packages > package-only). Verify the current official docs before writing or updating a recipe, and record the URL and date in the recipe's `officialSource`.
- **Local-first.** No servers, accounts, telemetry, or cloud sync. Presets stay on the user's device.
- **No silent changes.** Never overwrite files or `package.json` scripts without an explicit user decision. Nothing installs before the reviewed confirmation.
- **No fake features.** Do not add menu options or commands that claim to work but do nothing.
- **Safety.** Commands run without a shell (`execa` with argument arrays). Generated paths must stay inside the project root. Validate all JSON with Zod.

## Adding an integration recipe

1. Create `src/integrations/<id>/recipe.ts` implementing `IntegrationRecipe` (see `src/integrations/types.ts`).
2. Register it in `src/integrations/registry.ts`.
3. Set `supportedProjects` correctly so framework filtering works.
4. Add tests: detection, plan contents, and any option behavior.
5. Update the README's integration table.

## Tests

- Unit tests must not touch the real home directory, install real packages, or run official creators. Use temp directories and the injectable `CommandRunner`.
- Run a single file with `npx vitest run tests/<file>.test.ts`.

## Commit / PR guidelines

- Keep PRs focused; one feature or fix per PR.
- Describe what you verified manually (e.g. "ran `stackpack add --dry-run` in a Vite fixture").
- Update documentation when behavior changes.
