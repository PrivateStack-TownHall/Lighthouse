---
id: prisma
name: Prisma ORM
category: orm
status: partial
verified_on: 2026-11-23
versions:
  npm_latest: "@prisma/client 7.10.1; `prisma` CLI `latest` tag = 8.0.0-rc.34 (release candidate)"
  recommended: "7.x: pin `prisma@7` and `@prisma/client@7`"
  kit_tested: "none against a database; the kit only uses `prisma.$queryRaw` in an example"
node: "client 7: ^20.19 || ^22.12 || >=24; CLI 8 rc: ^22.18 || ^24.11 || >=26"
requires: []
conflicts_with: []
---
# Prisma ORM

## 1. What it is, in one line
Schema-first TypeScript ORM with migrations and a generated client.

## 2. Choose it when / do not choose it when
Choose for new TypeScript apps, especially NestJS. Choose Sequelize for continuity with older apps.

## 3. Versions and requirements
| Item | Value | Source |
|---|---|---|
| @prisma/client | 7.10.1 | `npm view` 2026-11-23 |
| `prisma` CLI, tag `latest` | 8.0.0-rc.34, a release candidate: do NOT install `prisma@latest` | `npm view` 2026-11-23 |
| `prisma@prev` / `@7` | 7.10.1 (the line the v7 quickstart uses) | [V] prisma.io v7 quickstart + `npm view prisma dist-tags` |
| Prisma ORM 8 | Release candidate; scaffolds with `npm create prisma@latest`; Node 22.18+, 24.11+ or 26+ | [V] prisma.io docs |

## 4. Scaffold (official CLI first)
Per database (the generator keeps only the line of the chosen database):
- PostgreSQL: `npm install prisma@7 @types/pg --save-dev`, `npm install @prisma/client@7 @prisma/adapter-pg pg dotenv`, `npx prisma init --datasource-provider postgresql --output ../generated/prisma` [V]
- MySQL: `npm install prisma@7 @types/node --save-dev`, `npm install @prisma/client@7 @prisma/adapter-mariadb dotenv`, `npx prisma init --datasource-provider mysql --output ../generated/prisma` [V] (the MySQL quickstart installs the CLI as `prisma@prev`; the library pins `prisma@7`)
- MongoDB: not supported by Prisma 7 (prisma.io: use Prisma 6.19); choose Mongoose [V]

Init creates `prisma/schema.prisma`, `.env` and a config file named `prisma7.config.ts` (the v7 page says 7.10+ uses this name to avoid clashing with the v8 format; the v7 CLI finds either name) [V].

## 5. Install
See Scaffold. A driver adapter is required: the client is constructed with it.
- PostgreSQL: `@prisma/adapter-pg` [V]
- MySQL: `@prisma/adapter-mariadb` (MySQL and MariaDB) [V]

## 6. Folder structure
`docs/ARCHITECTURE.md` section 1: `prisma/schema.prisma`, `prisma/migrations/`, `src/prisma/prisma.service.ts`.

## 7. package.json scripts
`templates/package-scripts.backend-nest-prisma.json`. Verified commands: `prisma migrate dev --name <n>`, `prisma generate`, `prisma studio` [V]. **The template has not been checked against Prisma 7**: it calls `prisma generate` in `dev` / `build` / `typecheck` / `test` / `postinstall` and runs the seed with `ts-node` from `prisma/seed.ts`. How v7 configures the seed was not on the fetched page [?].

## 8. Config files
Generator: `provider = "prisma-client"`, `output = "../generated/prisma"` (ESM-first) [V]. `DATABASE_URL` in `.env`, read by the config file via `dotenv/config` [V].
- PostgreSQL: `const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })` from `@prisma/adapter-pg`, then `new PrismaClient({ adapter })` [V]
- MySQL: `new PrismaMariaDb({ host, user, password, database, ... })` from `@prisma/adapter-mariadb`, then `new PrismaClient({ adapter })`; the quickstart reads `DATABASE_HOST`, `DATABASE_USER`, ... [V]. Keeping only `DATABASE_URL` (FR-016) means parsing it yourself [?]

## 9. Rules (MUST / MUST NOT)
- MUST pin the Prisma major (`prisma@7`, `@prisma/client@7`); MUST NOT install `prisma@latest` while it points to a release candidate.
- MUST construct `PrismaClient` with the driver adapter of the chosen database.
- PostgreSQL: MUST use `@prisma/adapter-pg`.
- MySQL: MUST use `@prisma/adapter-mariadb`.
- MUST change the schema only through `prisma migrate dev`; commit `prisma/migrations/`.
- MUST map snake_case columns with `@map` / `@@map`; JSON stays camelCase.
- MUST probe the database for observability with a `SELECT 1` query through the adapter-backed client.

## 10. Known pitfalls
- The generated client lives outside `node_modules` (`generated/prisma`); add it to `.gitignore` and generate in `postinstall` or CI [?].
- Prisma 7 quickstart sets `"type": "module"`; a CommonJS Nest scaffold (`--type cjs`) may need adjustment [?]. Check on the first app.

## 11. Prompt fragment
> Use Prisma ORM 7 (`prisma@7`, `@prisma/client@7`); do not upgrade to Prisma 8 (release candidate). The client is created with a driver adapter: `new PrismaClient({ adapter })`. Schema changes go through `npx prisma migrate dev --name <name>`.
> - PostgreSQL: adapter `@prisma/adapter-pg` with `pg`.
> - MySQL: adapter `@prisma/adapter-mariadb`.

## 12. Verification
| Claim | Mark | Evidence |
|---|---|---|
| Packages, init command, config file name, generator block, adapter, migrate/generate/studio | [V] | prisma.io v7 PostgreSQL quickstart |
| `latest` tag of `prisma` is an RC | [V] | `npm view prisma dist-tags` |
| MySQL packages, init, adapter | [V] | prisma.io v7 MySQL quickstart |
| No MongoDB in Prisma 7 | [V] | prisma.io v7 MongoDB page |
| MySQL with only `DATABASE_URL` | [?] | quickstart uses separate variables |
| Seed configuration in v7 | [?] | not on the fetched page |
| Kit template scripts against Prisma 7 | [?] | not run |
| Prisma 8 scaffold | [V] | prisma.io docs page (RC) |

## 13. Sources
- https://www.prisma.io/docs/v7/prisma-orm/quickstart/postgresql
- https://www.prisma.io/docs/v7/prisma-orm/quickstart/mysql
- https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/mongodb
- https://www.prisma.io/docs/getting-started/setup-prisma/start-from-scratch-typescript-postgres
- `npm view prisma dist-tags`
