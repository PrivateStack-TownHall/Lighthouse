# Lighthouse architecture

Lighthouse has an Express API and a React + Vite UI in JavaScript. The generator reads internal specifications and templates, then exports project-specific documents and their implementation references.

| Topic | Standard | Lighthouse | Why |
|---|---|---|---|
| Database | PostgreSQL + Sequelize or Prisma | JSON files in `database/` (one file per collection) | Requested for this app: no server to run, data is small. |
| `DATABASE_URL` | `postgresql://...` | `file:../database` | Keeps FR-016 (the variable exists and is validated); the store resolves it to a folder. |
| `src/database/` | models, migrations, seeders | `json-store.js` (atomic writes, one queue per collection) + `scripts/db.js` (`setup`, `seed`, `reset`) | No ORM; rows keep snake_case keys (FR-011), services map them to camelCase. |
| Front end language | Shared UI interfaces | JavaScript: `lib/api-client.js`, `lib/error-messages.js`, `components/QueryState.jsx`, `helpers/index.js` implemented in the application | Requested stack (JS). |
| `lib/api-client.js` | no refresh logic | one silent retry after `POST /auth/refresh` | Authentication retry belongs in the shared client. |
| Routing | `app/router.tsx` + `pages/` | no router: `app/App.jsx` shows `LoginPage` or `WorkspacePage` | Single page by design; drawers keep everything on one page. |
| Generator | - | `api/kit/` holds internal requirements and templates; `modules/generator` imports `kit/library/generate.mjs` | The exported package includes applicable specifications, scope-based DoD and stack guidance; no internal source directory is required by the recipient. |

## API modules
- `modules/auth`: login, refresh (stateless JWT with `typ: "refresh"`, 7 days), me.
- `modules/projects`: CRUD on `database/projects.json` (the UI autosaves one current project). With `AUTH_REQUIRED=true`: read ADMIN, STAFF, USER; write ADMIN, STAFF. Default: open (local tool).
- `modules/generator`: `GET /api/options` (choices, tools, presets, Fixed Rules, outputs), `POST /api/compatibility-checks`, `POST /api/generations` (ADMIN, STAFF), `GET /api/generations`.
- `observability`: shared application module; activity sources = projects + generations.

## UI features
`features/auth` (sign-in, only with `AUTH_REQUIRED=true`), `features/configuration` (model + reducer, live check, logo selects), `features/generator` (stepper, outputs, preview, export), `features/projects` (autosave).

## Generated package
Every non-empty output selection also includes `docs/DEFINITION_OF_DONE.md`, `docs/PROJECT_CONTRACT.md`, `docs/ARCHITECTURE.md`, `docs/STACK.md` and applicable conventions, ports, observability and design guidance. Supporting documents follow the project mode and selected folder names. Prompts describe implementation and verification rather than copying unavailable source files. A prompts-only ZIP includes these references. Feature details are optional; without them, the implementation step follows the project description and custom rules.
