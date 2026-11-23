---
id: express-sequelize-postgresql
name: Express + Sequelize + PostgreSQL
category: combo
status: partial
verified_on: 2026-11-23
members: [express, sequelize, postgresql]
---

# Express + Sequelize + PostgreSQL

Only what is true of the **combination**. Everything else is in the member files.

## Wiring
- Observability probe: `checkDatabase: async () => { await sequelize.authenticate(); }` [T for the router; the Sequelize call itself was not run].
- `.sequelizerc` points the CLI at `src/database/{models,migrations,seeders}`; scripts in `templates/package-scripts.backend-express-sequelize.json`.
- Shared-database scoping goes in `common/scope`.

## Open points (verify on the first app)
| Point | Mark |
|---|---|
| ESM project: migrations/seeders as `.cjs` | [?] |
| `.sequelizerc` with ESM models | [?] |
| `db:create` before `db:migrate` in `db:setup` | [?] not run |
| Compose template starts the database and the API | [?] not run |

## Prompt fragment
> Express (ESM) with Sequelize v6. Models in `src/database/models`, migrations and seeders in `src/database/*` (CLI configured by `.sequelizerc`; if the project is ESM they may need the `.cjs` extension). Probe the database with `sequelize.authenticate()`.
