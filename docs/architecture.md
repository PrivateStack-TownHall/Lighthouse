# Architecture: what differs from the Contract Kit standard

The layout follows `contract-kit/docs/ARCHITECTURE.md` section 0 (repo), 2 (Express) and 3 (Vite + React), in JavaScript. Only the differences are listed here.

| Topic | Standard | Lighthouse | Why |
|---|---|---|---|
| Database | PostgreSQL + Sequelize or Prisma | JSON files in `database/` (one file per collection) | Requested for this app: no server to run, data is small. |
| `DATABASE_URL` | `postgresql://...` | `file:../database` | Keeps FR-016 (the variable exists and is validated); the store resolves it to a folder. |
| `src/database/` | models, migrations, seeders | `json-store.js` (atomic writes, one queue per collection) + `scripts/db.js` (`setup`, `seed`, `reset`) | No ORM; rows keep snake_case keys (FR-011), services map them to camelCase. |
| Front end language | TypeScript kit files | JavaScript: `lib/api-client.js`, `lib/error-messages.js`, `components/QueryState.jsx`, `helpers/index.js` converted from the kit | Requested stack (JS). |
| `lib/api-client.js` | no refresh logic | one silent retry after `POST /auth/refresh` | `library/integrations/axios.md`: write it once in the client. |
| Routing | `app/router.tsx` + `pages/` | no router: `app/App.jsx` shows `LoginPage` or `WorkspacePage` | Single page by design; drawers keep everything on one page. |
| Generator | - | `api/kit/` holds Contract Kit v1.3 (`docs/`, `library/`, `templates/`); `modules/generator` imports `kit/library/generate.mjs` | The library is the only source of the generated text. Update the kit by replacing `api/kit/`. |

## API modules
- `modules/auth`: login, refresh (stateless JWT with `typ: "refresh"`, 7 days), me.
- `modules/projects`: CRUD on `database/projects.json` (the UI autosaves one current project). With `AUTH_REQUIRED=true`: read ADMIN, STAFF, USER; write ADMIN, STAFF. Default: open (local tool).
- `modules/generator`: `GET /api/options` (choices, tools, presets, Fixed Rules, outputs), `POST /api/compatibility-checks`, `POST /api/generations` (ADMIN, STAFF), `GET /api/generations`.
- `observability`: copied from the kit; activity sources = projects + generations.

## UI features
`features/auth` (sign-in, only with `AUTH_REQUIRED=true`), `features/configuration` (model + reducer, live check, logo selects), `features/generator` (stepper, outputs, preview, export), `features/projects` (autosave).
