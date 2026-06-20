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
| Any npm script | `docker-compose run --rm chem npm run <script>` |
| Rebuild image | `docker-compose build chem` |

Container details:
- Service: `chem`
- Image: `node:22-bookworm` (see `web_app/Dockerfile`)
- Workdir: `/web_app`
- App source: `web_app/` (bind-mounted into the container)

## Workflow

1. After changing `package.json` or `package-lock.json`, run install in Docker:
   `docker-compose run --rm chem npm install`
2. To verify changes, build in Docker:
   `docker-compose run --rm chem npm run build`
3. If Docker commands fail because the image is stale, rebuild:
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

Prefer `docker-compose run --rm chem` when possible — it matches the project's Dockerfile and volume mounts.

## Do not

- Run `cd web_app && npm install` or `npm run build` on the host
- Assume host `node --version` reflects the build environment
- Install `node_modules` with host Node (breaks the bind-mounted `web_app/node_modules`)

## Tests

No test script is defined in `package.json` today. When one is added, run it the same way:

`docker-compose run --rm chem npm test`
