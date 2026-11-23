---
id: sequelize
name: Sequelize
category: orm
status: partial
verified_on: 2026-11-23
versions:
  npm_latest: "sequelize 6.37.8, sequelize-cli 6.6.5"
  recommended: "6.x"
  kit_tested: "none (no Sequelize code in the kit)"
node: ">=10"
requires: []
conflicts_with: []
---
# Sequelize

## 1. What it is, in one line
Promise-based ORM with a migration CLI. The kit templates pair it with Express.

## 2. Choose it when / do not choose it when
Choose when your existing apps already use it. Choose Prisma for new TypeScript apps.

## 3. Versions and requirements
| Item | Value | Source |
|---|---|---|
| sequelize | 6.37.8 | `npm view` 2026-11-23 |
| sequelize-cli | 6.6.5 | `npm view` 2026-11-23 |
| pg | 8.23.1 | `npm view` 2026-11-23 |
| pg-hstore | 2.3.4 | `npm view` 2026-11-23 |

## 4. Scaffold (official CLI first)
```bash
npx sequelize-cli init
```
The command comes from the product spec and general experience; the fetched docs page only mentions `init` in passing [?].

## 5. Install
`npm i sequelize` and `npm i -D sequelize-cli`, plus the driver of the database:
- PostgreSQL: `npm i pg pg-hstore` [V]
- MySQL: `npm i mysql2` (Sequelize 6 needs mysql2 >= 2.3.3; MySQL ^5.7 or ^8.0) [V]
- MongoDB: not supported by Sequelize (SQL dialects only); choose Mongoose [V]

## 6. Folder structure
`src/database/{models,migrations,seeders}` (`docs/ARCHITECTURE.md` section 2). This needs a `.sequelizerc` that points the CLI at those paths.

## 7. package.json scripts
`templates/package-scripts.backend-express-sequelize.json`: `db:create`, `db:migrate`, `db:seed`, `db:reset`, `db:setup` (all via `sequelize-cli`).

## 8. Config files
`.sequelizerc` (JSON or a Node script that exports an object; the CLI loads it automatically) [V]. The CLI looks for `config/config.js` or `config/config.json` unless `--config` is given [V]. A connection string can come from `--url` or from `use_env_variable` [V]. Migrations are tracked in the `SequelizeMeta` table by default (`migrationStorage`); seeds are not tracked (`seederStorage: none`) [V].

## 9. Rules (MUST / MUST NOT)
- MUST create schema changes only through migrations (`up` and `down`).
- MUST keep column names snake_case and map to camelCase in the model.
- MUST put every `where` for shared-database scoping in `common/scope`.
- MUST NOT use `sync({ force: true })` outside tests.

## 10. Known pitfalls
- ESM project: migrations and seeders usually have to be `.cjs` [?].
- Seeds are not tracked by default: running `db:seed:all` twice inserts twice unless the seed is idempotent [V: default is `none`].

## 11. Prompt fragment
> Use Sequelize v6 with sequelize-cli. Models, migrations and seeders live in `src/database/`, with a `.sequelizerc` pointing the CLI there. Every schema change is a migration with `up` and `down`. Column names are snake_case.

## 12. Verification
| Claim | Mark | Evidence |
|---|---|---|
| `.sequelizerc`, config lookup, storage options | [V] | sequelize/cli docs README |
| `init`, `db:create`, `db:migrate`, `db:seed:all`, `model:generate` | [?] | not on the fetched page |
| `.cjs` for ESM | [?] | not verified |
| Versions | [V] | `npm view` 2026-11-23 |
| MySQL needs mysql2 >= 2.3.3, MySQL ^5.7 / ^8.0; dialect list without MongoDB | [V] | sequelize.org/releases, sequelize.org/docs/v6/getting-started |

## 13. Sources
- https://raw.githubusercontent.com/sequelize/cli/HEAD/docs/README.md
- `npm view sequelize sequelize-cli pg`
- https://sequelize.org/releases/
- https://sequelize.org/docs/v6/getting-started/
