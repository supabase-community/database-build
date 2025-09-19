# Migration from npm to pnpm

Date: 2025-09-19

## Summary
We migrated the monorepo from `npm` to `pnpm` for improved performance, disk space efficiency via content-addressable storage, better workspace linking, and deterministic installs. This document explains the changes, how to adapt your workflow, and common command equivalents.

## Key Changes
- Added `pnpm-workspace.yaml` to define workspaces (`apps/*`, `packages/*`).
- Updated `packageManager` field in the root `package.json` to `pnpm@9.12.0` enabling Corepack-managed version pinning.
- Replaced all `npm` and `npx` usages in scripts, docs, and Dockerfiles with `pnpm` / `pnpm dlx`.
- Internal workspace dependency `@database.build/deploy` now referenced using `"workspace:*"` so pnpm does not attempt to fetch it from the registry.
- Generated `pnpm-lock.yaml` and removed the legacy `package-lock.json`.
- Docker images now enable Corepack and use `pnpm dlx turbo` instead of globally installing `turbo`.

## Command Mapping
| Action | npm | pnpm |
| ------ | --- | ---- |
| Install deps | `npm install` | `pnpm install` |
| Add dep | `npm install <pkg>` | `pnpm add <pkg>` |
| Add dev dep | `npm install -D <pkg>` | `pnpm add -D <pkg>` |
| Remove dep | `npm uninstall <pkg>` | `pnpm remove <pkg>` |
| Run script | `npm run build` | `pnpm run build` or `pnpm build` |
| Execute one-off bin (was npx) | `npx <bin>` | `pnpm dlx <bin>` |
| List outdated | `npm outdated` | `pnpm outdated` |
| Update deps | `npm update` | `pnpm update` |
| Rebuild | `npm rebuild` | `pnpm rebuild` |
| Audit | `npm audit` | `pnpm audit` |

## One-off CLI (dlx)
Use `pnpm dlx` for ephemeral package execution instead of `npx`.
Examples:
```sh
pnpm dlx supabase start
pnpm dlx openapi-typescript https://api.supabase.com/api/v1-json -o ./path/to/types.ts
```

## Turbo Usage
`turbo` is invoked via `pnpm dlx turbo <command>` inside Docker to avoid global installs. Locally you can just run workspace scripts, e.g.:
```sh
pnpm dev
```
which maps to `turbo watch dev` in the root.

## Workspace Dependencies
Use the workspace protocol when referring to internal packages to ensure proper linking:
```json
"dependencies": {
  "@database.build/deploy": "workspace:*"
}
```

## CI / Containers
Ensure CI images execute:
```sh
corepack enable
pnpm install --frozen-lockfile
```
If reproducibility is critical, pass `--frozen-lockfile` to error on lock drift.

## Caching Considerations
pnpm's store is content-addressable and can be cached across builds (e.g., in GitHub Actions cache the directory from `pnpm store path`). Retrieve it like:
```sh
pnpm store path
```

## Typical Developer Flow
```sh
corepack enable        # first time only (often already enabled)
pnpm install           # install deps
pnpm dev               # start dev environment
pnpm build             # build all
```

## Troubleshooting
| Symptom | Cause | Fix |
| ------- | ----- | --- |
| 404 installing a local workspace package | Missing `workspace:*` spec | Update dependency to `"workspace:*"` |
| WARN about packages installed by different manager | Leftover `node_modules` from npm | Remove root & sub `node_modules` and reinstall (`git clean -fdx` or manual delete) |
| Command not found after migration | Using `npx` still | Switch to `pnpm dlx <cmd>` |

## Cleanup Leftovers
If you still have stray `package-lock.json` files locally, remove them. Only `pnpm-lock.yaml` should be committed.

## Future Updates
To bump pnpm version (maintained by Corepack):
```sh
corepack prepare pnpm@<new-version> --activate
```
Update the `packageManager` field accordingly in the root `package.json`.

---
Migration owners: @maintainers

If anything is unclear, open an issue with the label `pnpm`.
