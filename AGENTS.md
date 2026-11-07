# Repository Guidelines

## Project Structure & Module Organization
WebTool is a Vue 3 + Bootstrap 5 SPA served by a Cloudflare Worker with a D1 database.
- `src/` frontend: `main.js`, `router.js` (vue-router, auth guard), `auth.js` (session state and `api()` helper), `App.vue`.
- `src/views/` pages (`Home.vue`, `Login.vue`); `src/views/tools/` one component per tool.
- `src/tools/registry.js` is the tool list; `src/tools/*.js` holds pure logic such as `jsonToJava.js`.
- `worker/` backend: `index.js` (API routes), `auth.js` (PBKDF2 hashing, sessions).
- `schema.sql` D1 tables; `wrangler.jsonc` Worker, assets and D1 binding; `dist/` is build output.

## Build, Test, and Development Commands
- `npm run dev`: Vite dev server on 5173; proxies `/api` to 8787.
- `npx wrangler dev --port 8787`: Worker plus local D1; run alongside `npm run dev`.
- `npx wrangler d1 execute webtool --local --file=schema.sql`: initialize local tables once.
- `npm run build`: build the frontend into `dist/`; rerun before viewing http://localhost:8787.
- `npm run deploy`: build and deploy. Create the D1 database first and set `database_id`.

## Coding Style & Naming Conventions
JavaScript ES modules, 2-space indent, single quotes, no semicolons. Vue files use `<script setup>`. Components are PascalCase (`JsonTool.vue`); functions and variables are camelCase. Keep comments short and in Chinese, matching existing code. No linter or formatter is configured yet.

## Adding a Tool
1. Create `src/views/tools/XxxTool.vue`; keep processing in the browser.
2. Add an entry (`id`, `name`, `desc`, `icon`, `category`, lazy `component`) to `src/tools/registry.js`. Routes and home search pick it up automatically.
3. Put reusable logic in `src/tools/` so it can be tested without the UI.

## Testing Guidelines
No test framework is set up. Before submitting, run `npm run build` and exercise the changed page manually. For pure logic or Worker routes, verify with a throwaway Node script and delete it afterwards. If adding tests, use Vitest with `*.test.js` beside the source.

## Commit & Pull Request Guidelines
History uses short imperative subjects. Use short imperative subjects such as `Add cron parser tool`. PRs should describe the change, list manual checks, and include screenshots for UI changes.

## Security & Configuration Tips
- All `/api` routes except status, login, register and logout require a logged-in session; `/api/admin/*` additionally requires the `admin` role. Keep new routes behind these checks.
- The first registered user becomes the first admin; registration then closes and admins create further users. Register immediately after deploying.
- Never commit `.dev.vars`, `.wrangler/` or `node_modules/` (already in `.gitignore`).
- Pin exact dependency versions (`npm install --save-exact`).

## Users, Permissions & Migrations
- Roles: `admin` (all tools, manages users) and `user` (tools listed in `permissions`, JSON like `{"tools":["json"]}` or `*`). Tool access is enforced in the UI only; `/api/admin/*` is enforced server-side in `worker/admin.js`.
- Audit events go through `audit()` in `worker/auth.js`; login throttling uses `login_attempts`.
- Schema changes to an existing D1 go in `migrations/NNN_*.sql` (run once, not idempotent) and must also be reflected in `schema.sql`. Run the migration with `--remote` before `npm run deploy`.