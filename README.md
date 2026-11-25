# Lighthouse

Single-page **Contract & Prompt Generator**. Configure a project (information, technology stack, contract rules), check it against the implementation requirements, and generate a consistent package: `PROJECT_CONTRACT.md`, `ARCHITECTURE.md`, `SYSTEM_DESIGN.md`, `DEVELOPMENT_STANDARDS.md`, `MASTER_PROMPT.md` and `PROMPTS/`, as files, a ZIP or one Markdown file. Each package includes a scope-based Definition of Done and the specifications needed to implement it; no external source folder or feature list is required.

| | |
|---|---|
| UI | React 19 + Vite 8, JavaScript, Tailwind CSS 4, framer-motion, TanStack Query, axios, lucide-react, react-markdown, JSZip |
| API | Express 5 (ESM), Zod 4, jsonwebtoken, bcryptjs, swagger-ui-express |
| Database | JSON files in `database/` (`users.json`, `projects.json`, `generations.json`) |
| Standard | Response envelope, `/api` routes, observability, auth contract, ports A1 #02 |

## Quick start (Node 22.12 or newer)
```bash
npm run install:all          # installs api/ and ui/
node scripts/setup-env.mjs   # creates api/.env (random JWT_SECRET) and ui/.env
# edit api/.env: ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME
npm run db:setup             # creates database/*.json and the admin account
npm run dev                  # API http://localhost:3102/api  ·  UI http://localhost:5102
```
`npm run setup` does the first four steps in one go. No sign-in is needed by default (`AUTH_REQUIRED=false` in `api/.env`); with `AUTH_REQUIRED=true` the UI asks for the seeded account (`admin@lighthouse.local` / `change-me-please` unless changed).

## Scripts (root)
| Script | Does |
|---|---|
| `dev` | API and UI together (`dev:api`, `dev:ui` run one each) |
| `test` | API contract and generator regression tests (`node --test`); UI and ZIP export tests (Vitest + Testing Library) |
| `lint`, `typecheck` | ESLint; syntax check (API) and production build check (UI) |
| `db:setup`, `db:seed`, `db:reset` | create the JSON database and the admin account, empty + reseed it |

## Folders
```
lighthouse/
├─ api/            Express API (shared middleware, observability, and internal generator library in kit/)
├─ ui/             React + Vite app (features/, components/, lib/, helpers/, styles/tokens.css)
├─ database/       JSON database (created by npm run db:setup)
├─ docs/           Definition of Done, API contract, architecture differences, design system
├─ scripts/        dev runner, env setup
└─ CHANGELOG.md
```

The two `docs/` directories have different owners:

| Location | Purpose | Exported? |
|---|---|---|
| `docs/` | Documentation and acceptance criteria for Lighthouse itself | No |
| `api/kit/docs/` | Source rules and templates used by the generator | Applicable content is adapted into the generated project's `docs/` |

The generated `docs/DEFINITION_OF_DONE.md` is assembled from `api/kit/docs/DEFINITION_OF_DONE.md` and the selected project configuration. The root `docs/DEFINITION_OF_DONE.md` is not its source.

## Data and sign-in
- The current configuration is saved automatically in `database/projects.json` and restored on the next visit; every generation is logged in `database/generations.json`.
- `AUTH_REQUIRED=false` (default): local tool, no sign-in. `AUTH_REQUIRED=true`: the generator and projects follow the auth contract (ADMIN and STAFF write, USER reads). `/api/monitoring` and `/api/activities` always need ADMIN or STAFF (FR-006).

## Technology logos
Put one file per technology in `ui/src/assets/tech/` named by its id (`postgresql.svg`, `react-vite.svg`, ...; list in that folder's README). Until a file is there, the select shows a monogram.

## Updating the library
The internal generator sources live in `api/kit/`: implementation requirements, compatibility rules and output templates. Update the relevant source documents and templates together, run the regression checks, then regenerate examples. Exported packages include their applicable specifications under `docs/`; they never require this internal folder. FR-021 uses agreed scope and verification evidence, with optional feature details and no release-stage freeze.

More: `docs/DEFINITION_OF_DONE.md` (scope, acceptance criteria and verification), `docs/architecture.md` (application structure and generation flow), `docs/api-contract.md`.
