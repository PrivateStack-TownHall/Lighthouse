---
id: mysql
name: MySQL
category: database
status: draft
verified_on: 2026-11-23
versions:
  npm_latest: "n/a (server); driver mysql2 3.24.6"
  recommended: "MySQL 8.0 (Sequelize 6 supports ^5.7 and ^8.0)"
  kit_tested: "none"
node: "n/a"
requires: []
conflicts_with: []
---
# MySQL

## 1. What it is, in one line
Relational database. The kit has no MySQL template: the compose file and the env example are PostgreSQL.

## 2. Choose it when / do not choose it when
Choose when the hosting or an existing system requires MySQL. Otherwise PostgreSQL is the kit default.

## 3. Versions and requirements
| Item | Value | Source |
|---|---|---|
| Sequelize 6 | MySQL ^5.7, ^8.0 with `mysql2` >= 2.3.3 | [V] sequelize.org/releases |
| Prisma 7 | MySQL 5.6+ through `@prisma/adapter-mariadb` | [V] prisma.io v7 supported databases, MySQL quickstart |
| mysql2 | 3.24.6 | `npm view` 2026-11-23 |
| Docker image and version for compose | not checked | [?] |

## 4. Scaffold (official CLI first)
No scaffold. The kit compose template runs PostgreSQL: replace the `db` service with a MySQL image yourself [?].

## 5. Install
Driver per ORM: Sequelize `mysql2`, Prisma `@prisma/adapter-mariadb` (see the ORM document).

## 6. Folder structure
No application folders.

## 7. package.json scripts
`db:*` scripts come from the ORM template.

## 8. Config files
`DATABASE_URL=mysql://user:password@localhost:2CNN/app_db` (host port from `docs/PORTS.md`) [?].

## 9. Rules (MUST / MUST NOT)
- MUST keep UUID ids (FR-009); store them as `CHAR(36)` or binary and keep one choice for the whole app [?].
- MUST keep `created_at` / `updated_at` and UTC timestamps (`docs/CONVENTIONS.md`).
- MUST store money as integer rupiah.
- MUST pin the major version in compose.

## 10. Known pitfalls
- The kit compose template, `db:create` script and env example assume PostgreSQL: adapt all three [?].

## 11. Prompt fragment
> Database is MySQL. UUID primary keys (one storage type for the whole app), snake_case columns, `created_at` / `updated_at` in UTC, money as integer rupiah. The kit compose template is PostgreSQL: replace its `db` service with MySQL.

## 12. Verification
| Claim | Mark | Evidence |
|---|---|---|
| Supported versions per ORM | [V] | sequelize.org/releases, prisma.io v7 |
| mysql2 version | [V] | `npm view mysql2` |
| Compose image, URL form, UUID storage type | [?] | not checked |

## 13. Sources
- https://sequelize.org/releases/
- https://www.prisma.io/docs/v7/prisma-orm/quickstart/mysql
- `npm view mysql2`
