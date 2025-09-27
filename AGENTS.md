# Repository Guidelines

## Project Structure & Module Organization
This repo is a Turborepo workspace. Source apps live under `apps/`: NestJS services in `apps/api`, the merchant facing Next.js client in `apps/merchant-app`, and the booking kiosk in `apps/booking-app`. Shared UI primitives, utilities, and TypeScript types are under `packages/` (`ui`, `utils`, `types`, `shared`). Domain documentation and operational playbooks sit in `docs/` and top-level `.md` guides; check `ENVIRONMENT-STRUCTURE.md` before touching config. End-to-end artefacts live in `tests/` and `e2e/`, while `scripts/` and root-level Node utilities support maintenance tasks.

## Build, Test, and Development Commands
Install workspace deps once with `npm install` from the repo root. Common workflows:
```bash
npm run dev           # Turbo-powered dev servers (parallel apps)
npm run build         # Build all workspaces
npm run lint          # Run shared lint target
npm run typecheck     # Composite TypeScript checks
npm run dev:all       # Start API + merchant app together
```
Service-specific scripts exist under each app (`npm run api:dev`, `npm run merchant:dev`, etc.) for focused work.

## Coding Style & Naming Conventions
Use Prettier defaults (2-space indents, single quotes in TSX/TS) via `npm run format`. ESLint governs both Nest and Next codebases; resolve lint violations before pushing. Follow idiomatic React component names in PascalCase, hooks in `useCamelCase`, and file-based routes in kebab-case. Shared packages expose typed APIs—prefer importing from `@heya-pos/*` aliases defined in `tsconfig.json`.

## Testing Guidelines
API services rely on Jest; run `npm run api test:watch` for targeted feedback and `npm run api test:cov` to gauge coverage. UI regression and booking flow checks sit in Playwright specs under `tests/`; execute `npx playwright test` from the root (or `tests/pages` for single scenarios). Keep spec filenames descriptive (`feature-scenario.spec.ts`) and co-locate helper utilities under `tests/utils`. When adding new features, include a representative e2e path plus unit coverage where logic branches meaningfully diverge.

## Commit & Pull Request Guidelines
Commit history follows Conventional Commit semantics (`fix:`, `feat:`, `chore:`). Use present-tense, imperative summaries under ~72 characters and include scoped prefixes when touching a single app (`feat(api): ...`). PRs should group related changes, link Jira/Trello references, and describe validation steps; attach screenshots or console captures for UI adjustments. Ensure checks (`lint`, `typecheck`, relevant tests) pass before requesting review and highlight any follow-up tasks in the PR description.

## Local Development (September 27, 2025)
- Local Postgres now runs via Docker Compose on `localhost:5432` with `POSTGRES_USER=user`, `POSTGRES_PASSWORD=password`, and database `heya_pos`.
- Export `DATABASE_URL=postgres://user:password@localhost:5432/heya_pos` and `DIRECT_URL=postgres://user:password@localhost:5432/heya_pos` in your shell session before invoking Prisma or `npm run dev`; the old Fly proxy credentials are deprecated.
- Add `export PATH="$HOME/.nvm/versions/node/v22.19.0/bin:$PATH"` to your shell init if you rely on NVM, otherwise Turbo won’t find `npm`.
- To clone production data locally: run `flyctl proxy 6432 -a heya-pos-db`, dump with `pg_dump -h 127.0.0.1 -p 6432 -U postgres --format=custom --no-owner postgres > fly-backup.dump`, then restore into Docker using `pg_restore -h localhost -p 5432 -U user --clean --no-owner -d heya_pos fly-backup.dump`.
- After restoring, restart your shell (or re-export the vars) before running `npm run dev` so Prisma connects without P1000 authentication failures.
