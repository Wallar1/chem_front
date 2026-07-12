---
name: docker-node
description: >-
  Run npm install, build, dev, and test commands inside the chem_front Docker
  container (Node 22), not on the host. Use when installing dependencies,
  running npm scripts, building the Svelte app, verifying builds, running tests,
  or any Node/npm work in web_app.
---

# Docker Node (chem_front)

## Critical rule

**Never run `node`, `npm`, or `npx` directly on the host** for this project. The host may have Node 10.x, which cannot run Svelte 5. All installs, builds, and tests must run inside Docker (Node 22).

## Where to run commands

Run from the **repository root** (`chem_front/`), where `docker-compose.yml` lives.

| Task | Command |
|------|---------|
| Install deps | `docker-compose run --rm chem npm install` |
| Build | `docker-compose run --rm chem npm run build` |
| Dev server | `docker-compose up` (runs `npm run dev` in the container) |
| Tests (fast, container running) | `docker-compose exec chem npm test` |
| Tests (one-off, no dev server) | `docker-compose run --rm chem npm test` |
| Test watch (fast) | `docker-compose exec chem npm run test:watch` |
| Any npm script | `docker-compose exec chem npm run <script>` when `chem` is up, else `docker-compose run --rm chem npm run <script>` |
| Rebuild image | `docker-compose build chem` |

### `exec` vs `run`

- **`docker-compose exec chem …`** — Reuses the running `chem` container (started by `docker-compose up` or `docker-compose up -d chem`). No new container startup, no duplicate `node_modules` mount churn. **Prefer this for tests and repeated npm scripts during development.**
- **`docker-compose run --rm chem …`** — Starts a fresh one-off container, then removes it. Use for `npm install`, `npm run build`, CI, or when `chem` is not already running.

Container details:
- Service: `chem`
- Image: `node:22-bookworm` (see `web_app/Dockerfile`)
- Workdir: `/web_app`
- App source: `web_app/` (bind-mounted into the container)

## Workflow

1. Start dev (once per session): `docker-compose up -d chem`
2. After changing `package.json` or `package-lock.json`, run install in Docker:
   `docker-compose run --rm chem npm install`
3. To verify changes, run tests and/or build in Docker:
   `docker-compose exec chem npm test` (or `npm run test:fast` — same vitest run)
   `docker-compose run --rm chem npm run build`
4. If Docker commands fail because the image is stale, rebuild:
   `docker-compose build chem`

## Fallback (no docker-compose)

Only if `docker-compose` is unavailable:

```bash
docker run --rm \
  -v "$(pwd)/web_app:/web_app" \
  -w /web_app \
  node:22-bookworm \
  bash -c "npm install && npm run build"
```

Prefer `docker-compose exec chem` when the dev container is up; otherwise `docker-compose run --rm chem` — both match the project's Dockerfile and volume mounts.

## Do not

- Run `cd web_app && npm install` or `npm run build` on the host
- Assume host `node --version` reflects the build environment
- Install `node_modules` with host Node (breaks the bind-mounted `web_app/node_modules`)

## Tests

Vitest smoke tests live under `web_app/src/**/*.test.js`. They mount key Svelte components (including Battle scene) in jsdom to catch store subscription errors and basic scene switching.

Vitest is configured for a single jsdom worker (`pool: forks`, `singleFork: true`) so repeat runs stay fast inside the same container.

**Recommended (dev container already up):**

```bash
docker-compose up -d chem   # skip if already running
docker-compose exec chem npm test
```

**One-off (no running container):**

```bash
docker-compose run --rm chem npm test
```
