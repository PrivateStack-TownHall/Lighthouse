---
id: postgresql
name: PostgreSQL
category: database
status: draft
verified_on: 2026-11-23
versions:
  npm_latest: "n/a (server, not an npm package)"
  recommended: "pin one major in docker-compose"
  kit_tested: "none"
node: "n/a"
requires: []
conflicts_with: []
---
# PostgreSQL

## 1. What it is, in one line
Relational database. Host port `2CNN` maps to container port 5432.

## 2. Choose it when / do not choose it when
Default for every A1, A2 and A3 app.

## 3. Versions and requirements
| Item | Value | Source |
|---|---|---|
| Server version | Not verified. `templates/docker-compose.template.yml` uses `postgres:16-alpine`; check the current supported major before a new app | [?] |
| Host port | `2CNN` (`docs/PORTS.md`) | kit decision |
| URL form | `postgresql://user:password@host:port/db` | [V] Prisma v7 quickstart |

## 4. Scaffold (official CLI first)
Create a `db` service in `docker-compose.yml` with a pinned PostgreSQL image, a persistent volume, environment-supplied credentials and a `pg_isready` healthcheck. Map the assigned host port to 5432 for local development only.

## 5. Install
`pg` driver for Sequelize and for the Prisma adapter.

## 6. Folder structure
No application folders. Set the database name explicitly in the environment.

## 7. package.json scripts
`db:create`, `db:migrate`, `db:seed`, `db:reset`, `db:setup` must invoke real commands for the selected ORM.

## 8. Config files
`DATABASE_URL=postgresql://postgres:postgres@localhost:2CNN/app_db`. Compose healthcheck uses `pg_isready`.

## 9. Rules (MUST / MUST NOT)
- MUST use UUID primary keys, `created_at` / `updated_at`, UTC timestamps (`docs/CONVENTIONS.md`).
- MUST store money as integer rupiah.
- MUST NOT publish the database port outside local development.
- MUST pin the major version in compose.

## 10. Known pitfalls
- Two apps on one host must use different `2CNN` ports.
- `DATABASE_URL` in `.env` uses the host port; inside compose the API reaches the database by service name on 5432 [?].

## 11. Prompt fragment
> Database is PostgreSQL. Host port 2CNN maps to 5432 in the container. UUID primary keys, snake_case columns, `created_at` / `updated_at` in UTC. Money is an integer in rupiah.

## 12. Verification
| Claim | Mark | Evidence |
|---|---|---|
| URL form | [V] | Prisma v7 quickstart |
| Current server major | [?] | not checked |
| Compose template runs | [?] | not run |

## 13. Sources
- https://www.prisma.io/docs/v7/prisma-orm/quickstart/postgresql
- Contract Kit `templates/docker-compose.template.yml`
