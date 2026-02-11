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
Use `./scripts/dev-start.sh` and `./scripts/dev-stop.sh` for full-stack cold start/stop.

## Service Restart Source Of Truth (February 10, 2026)
- If PM2 is running this repo (check with `pm2 status`), restart services with PM2, not the per-app dev scripts.
- API restart command:
  ```bash
  pm2 restart api
  ```
- Verify API health immediately after restart:
  ```bash
  curl -i --max-time 10 http://localhost:3000/api/v1/health
  ```
- Expected result is `HTTP/1.1 200 OK` with `{"status":"ok"...}`.
- Do not use `apps/api/dev-service.sh` for API restarts while PM2 is supervising `api`, because PM2 will respawn processes and can create port conflicts/noisy restarts.

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

## Dev Server Recovery Playbook (September 28, 2025)
- Prefer `./scripts/dev-start.sh` when starting or restarting the stack. The script coordinates the API and merchant service managers (`apps/api/dev-service.sh`, `apps/merchant-app/dev-service.sh`) so stray watchers are killed before relaunch.
- If the merchant login page reports a "Network Error" or hangs, first verify the API is alive with `curl http://localhost:3000/api/v1/health`. A dead Nest process is the common culprit and will cause every server render of `/login` to time out.
- When ports appear busy, do **not** launch `npm run api:dev` or `npm run merchant:dev` directly. Run `./scripts/dev-stop.sh` to clean up zombies, then `./scripts/dev-start.sh` to relaunch. As a last resort you can manually kill processes with `ps -eo pid,ppid,cmd | grep heya-pos-remake | grep -v grep`.
- For quick checks, remember the merchant app proxies features via `/api/v1/features`; if that 403s or times out you will see the login issue. Clearing stale cookies or opening an incognito window can rule out client cache, but the fix is usually restarting the API/merchant app together.

## Production database migrations (Fly.io Managed Postgres)
Use these steps whenever a manual SQL migration needs to run against the production cluster (`w86750824lj03pk4`):

1. **Open a proxy** so `psql` can talk to the managed instance:
   ```bash
   /home/lukas/.fly/bin/flyctl mpg proxy --cluster w86750824lj03pk4
   ```
   This binds a local port (normally `127.0.0.1:16380`) to the cluster’s internal IPv6 address. Leave the proxy running in its own shell.

2. **Run the migration** from another terminal using the pooled user:
   ```bash
   psql "postgresql://fly-user:34jaZjy5m2SpLKPxhp4kt6rX@127.0.0.1:16380/fly-db" \
     -f apps/api/prisma/migrations/manual/<migration-file>.sql
   ```

3. **Verify the change** (optional but recommended):
   ```bash
   psql "postgresql://fly-user:34jaZjy5m2SpLKPxhp4kt6rX@127.0.0.1:16380/fly-db" \
     -c "SELECT column_name FROM information_schema.columns \n           WHERE table_name = 'Booking' AND column_name = 'customerRequestedStaff';"
   ```

4. **Close the proxy** once finished (Ctrl+C in the proxy terminal, or `pkill -f "flyctl mpg proxy"`).

If the proxy command fails, confirm you are logged in (`/home/lukas/.fly/bin/flyctl auth whoami`) and that the cluster is ready (`/home/lukas/.fly/bin/flyctl mpg status --cluster w86750824lj03pk4`).

## Fly MPG Read-Only Queries (Do **Not** Deviate)
When you need to inspect data on any Fly Managed Postgres (MPG) cluster, follow this exact flow. Do not improvise or reach for other commands.

1. **Fetch credentials** every time:
   ```bash
   /home/lukas/.fly/bin/flyctl mpg status <cluster-id> --json
   ```
   Use the JSON output to capture the `user`, `password`, and `dbname` fields for the session.

2. **Start a proxy in the background** and log its output:
   ```bash
   nohup /home/lukas/.fly/bin/flyctl mpg proxy --cluster <cluster-id> >/tmp/fly_proxy_<cluster-id>.log 2>&1 &
   ```
   The proxy binds `127.0.0.1:16380` unless occupied. Assume that port unless you explicitly see a different one in the log.

3. **Confirm the port is listening** (optional sanity check):
   ```bash
   lsof -i :16380
   ```

4. **Run your SQL via `psql`** using the credentials from step 1. Always pass the password through `PGPASSWORD` and connect to the proxy:
   ```bash
   PGPASSWORD=<password> psql "postgresql://<user>@127.0.0.1:16380/<dbname>" -c '<SQL here>'
   ```
   - For scripted output use `-t` (tuples only) or `-F '\t' -A` for tab-delimited results.
   - Never call `flyctl mpg connect` or any other helper; they drop you into interactive shells and often fail with EOFs.

5. **Tear down the proxy** the moment you finish:
   ```bash
   /bin/pkill -f "flyctl mpg proxy --cluster <cluster-id>"
   ```

This is the sole approved sequence for MPG reads. Stick to it and you won't get weird failures or partial connections again.

## Prisma Migration Workflow (Local Dev)
Prisma will only behave if the migration history stays in sync with our live dev database. Whenever you add or modify tables/columns:

1. **Back up first (if data matters).**
   ```bash
   pg_dump -h localhost -p 5432 -U user heya_pos > backup_dev_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Apply schema changes in `apps/api/prisma/schema.prisma`.**

3. **Generate a new migration.**
   ```bash
   cd apps/api
   npx prisma migrate dev --name add_descriptive_label
   ```
   This updates the local database, writes SQL under `apps/api/prisma/migrations`, and regenerates the Prisma client.

4. **Check for drift warnings.** If Prisma reports drift, do **not** reset the database. Instead:
   - Inspect `_prisma_migrations` to see which migration is missing.
   - Create placeholder SQL files for any legacy migrations (as we did with `20250615_add_booking_constraints`) so Prisma can record them.
   - Use `npx prisma migrate resolve --applied <migration_name>` to reconcile history.

5. **Re-run the new migration once history is clean.**
   ```bash
   npx prisma migrate dev --skip-generate   # verify it succeeds quickly
   ```

6. **Commit both the schema and migration files** together with your feature code.

7. **On other machines** (or after pulling):
   ```bash
   cd apps/api
   npx prisma migrate dev
   ```
   Do not use `prisma db push` except during emergency prototyping.

Keep the baseline migration (`00000000000000_initial_schema`) intact—it mirrors the current dev schema. If you ever have to re-baseline, regenerate it with:
```bash
npx prisma migrate diff --from-empty --to-url "$DATABASE_URL" --script > apps/api/prisma/migrations/00000000000000_initial_schema/migration.sql
```
and mark it applied with `npx prisma migrate resolve --applied 00000000000000_initial_schema`.
