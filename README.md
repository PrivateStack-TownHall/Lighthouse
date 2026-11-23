# Lighthouse – Contract Kit

Single-page **Contract & Prompt Generator**. Configure a project (information, technology stack, contract rules), check it against the Contract Kit library, and generate a consistent package: `PROJECT_CONTRACT.md`, `ARCHITECTURE.md`, `MASTER_PROMPT.md` and `PROMPTS/`, as files, a ZIP or one Markdown file.

| | |
|---|---|
| UI | React 19 + Vite 8, JavaScript, Tailwind CSS 4, framer-motion, TanStack Query, axios, lucide-react, react-markdown, JSZip |
| API | Express 5 (ESM), Zod 4, jsonwebtoken, bcryptjs, swagger-ui-express |
| Database | JSON files in `database/` (`users.json`, `projects.json`, `generations.json`) |
| Standard | Contract Kit v1.3: response envelope, `/api` routes, observability, auth contract, ports A1 #02 |

## Quick start (Node 22.12 or newer)
```bash
npm run install:all          # installs api/ and ui/
node scripts/setup-env.mjs   # creates api/.env (random JWT_SECRET) and ui/.env
# edit api/.env: ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME
npm run db:setup             # creates database/*.json, the admin and the example project (vibeDesk)
npm run dev                  # API http://localhost:3102/api  ·  UI http://localhost:5102
```
`npm run setup` does the first four steps in one go. No sign-in is needed by default (`AUTH_REQUIRED=false` in `api/.env`); with `AUTH_REQUIRED=true` the UI asks for the seeded account (`admin@lighthouse.local` / `change-me-please` unless changed).

## Scripts (root)
| Script | Does |
|---|---|
| `dev` | API and UI together (`dev:api`, `dev:ui` run one each) |
| `test` | API: 20 kit contract tests + 10 app tests (`node --test`); UI: 13 tests (Vitest + Testing Library) |
| `lint`, `typecheck` | ESLint; syntax check (API) and production build check (UI) |
| `db:setup`, `db:seed`, `db:reset` | create the JSON database and the admin account, empty + reseed it |

## Folders
```
lighthouse/
├─ api/            Express API (src/common and src/observability from the Contract Kit; kit/ = Contract Kit v1.3 library)
├─ ui/             React + Vite app (features/, components/, lib/, helpers/, styles/tokens.css)
├─ database/       JSON database (created by npm run db:setup)
├─ docs/           Definition of Done, API contract, architecture differences, design system
├─ scripts/        dev runner, env setup
└─ CHANGELOG.md
```

## Data and sign-in
- The current configuration is saved automatically in `database/projects.json` and restored on the next visit; every generation is logged in `database/generations.json`.
- `AUTH_REQUIRED=false` (default): local tool, no sign-in. `AUTH_REQUIRED=true`: the generator and projects follow the auth contract (ADMIN and STAFF write, USER reads). `/api/monitoring` and `/api/activities` always need ADMIN or STAFF (FR-006).

## Technology logos
Put one file per technology in `ui/src/assets/tech/` named by its id (`postgresql.svg`, `react-vite.svg`, ...; list in that folder's README). Until a file is there, the select shows a monogram.

## Updating the library
The generated text comes only from `api/kit/` (Contract Kit `docs/`, `library/`, `templates/`). Replace that folder with a newer kit and restart the API; run `npm test` in `api/` to confirm.

More: `docs/DEFINITION_OF_DONE.md` (scope, checklist, parking lot), `docs/architecture.md` (what differs from the standard), `docs/api-contract.md`.
