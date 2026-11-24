---
id: core-rules
name: Core Rules (Fixed Rules)
category: core
status: verified
verified_on: 2026-11-23
---

# Core Rules (Fixed Rules)

These are the **Fixed Rules (System)** of Lighthouse: they apply where relevant to the selected project scope and a project rule may not silently override them. Each rule has an ID so a Custom Rule that conflicts can name it. The exported project documents contain the implementation requirements.

| ID | Rule | Source |
|---|---|---|
| FR-001 | Every response uses `{ success, message, data, meta, error:{code,details}, requestId }`; lists put pagination in `meta.pagination` | `docs/CONVENTIONS.md` 1 |
| FR-002 | `message` and `error.code` are English; `error.code` is UPPER_SNAKE_CASE | 1 |
| FR-003 | `requestId` comes from middleware (or `X-Request-Id`) and is returned in the `X-Request-Id` header | 1 |
| FR-004 | Routes live under `/api` with no version segment; plural kebab-case | 2 |
| FR-005 | Every API ships `/api/health`, `/monitoring`, `/activities`, `/version`, `/public` | 2, `docs/OBSERVABILITY.md` |
| FR-006 | `/monitoring` and `/activities` need ADMIN or STAFF; `/health`, `/version`, `/public` are open | `docs/OBSERVABILITY.md` |
| FR-007 | Open endpoints return no personal data (no email or phone; names masked) | 2 |
| FR-008 | Query: `?page=&limit=&sort=-createdAt&q=`; `limit` 1-100 | 3 |
| FR-009 | IDs are UUID; `createdAt` / `updatedAt`; times in UTC ISO 8601 | 4 |
| FR-010 | Money is a whole-rupiah integer plus `currency` | 4 |
| FR-011 | JSON is camelCase; DB columns are snake_case | 4 |
| FR-012 | Auth: `/auth/login`, `/auth/refresh`, `/auth/me`; payload `{ sub, role, iat, exp }`; roles ADMIN, STAFF, USER; 401 vs 403 | 5 |
| FR-013 | Passwords are hashed with `bcryptjs` | 5 |
| FR-014 | npm only; Zod everywhere; ESLint; scripts `dev`, `build`, `start`, `typecheck`, `lint`, `test`, `db:*` | 6 |
| FR-015 | Ports: API `3CNN`, UI `5CNN`, DB `2CNN`; only categories 1, 2, 3 | `docs/PORTS.md` |
| FR-016 | Env is validated by Zod at boot; `.env.example` has `DATABASE_URL`, `PORT`, `JWT_SECRET`, `CORS_ORIGIN`, `NODE_ENV` | `templates/env.example` |
| FR-017 | Folder names follow `docs/ARCHITECTURE.md`: `common/`, `modules/`, `observability/`, `helpers/`; `features/`, `lib/`, `helpers/` in front ends | `docs/ARCHITECTURE.md` |
| FR-018 | Controllers parse and respond; services hold logic and return raw values; not found is a 404, never `{ data: null }` | `docs/ARCHITECTURE.md` 1 |
| FR-019 | Front end: components use semantic tokens only; data goes through `lib/api-client`; loading, empty and error states use `QueryState` | `docs/DESIGN_SYSTEM.md`, `docs/ARCHITECTURE.md` |
| FR-020 | Swagger at `/api/docs`; every endpoint is documented; every feature has tests | `docs/CONVENTIONS.md` 2 |
| FR-021 | Define completion through scope-based acceptance criteria and verification evidence in docs/DEFINITION_OF_DONE.md; feature lists are optional, with no required count or release-stage freeze | `docs/DEFINITION_OF_DONE.md` |
| FR-022 | Use the official CLI to scaffold (`create vite`, `nest new`, `create-next-app`, `prisma init`, `sequelize-cli init`); never recreate an official structure by hand | product spec |

Not rules (repo choices, deliberately not standardized): Conventional Commits, `.nvmrc`, Prettier, `tsconfig` strictness, CI.
