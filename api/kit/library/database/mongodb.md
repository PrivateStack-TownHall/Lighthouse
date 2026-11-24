---
id: mongodb
name: MongoDB
category: database
status: draft
verified_on: 2026-11-23
versions:
  npm_latest: "n/a (server); driver mongodb 7.9.1"
  recommended: "use through Mongoose"
  kit_tested: "none"
node: ">=20.19.0 (mongodb driver 7)"
requires: ["mongoose"]
conflicts_with: []
---
# MongoDB

## 1. What it is, in one line
Document database. In this library it is used through Mongoose: Sequelize does not support it and Prisma 7 does not support it yet.

## 2. Choose it when / do not choose it when
Choose for document-shaped data. Do not choose it when you want SQL migrations, joins or the kit templates (all relational).

## 3. Versions and requirements
| Item | Value | Source |
|---|---|---|
| mongodb (Node driver) | 7.9.1, Node >= 20.19.0 | [V] `npm view mongodb` |
| Prisma 7 | not supported yet; prisma.io says use Prisma 6.19 | [V] prisma.io v7 MongoDB page |
| Sequelize | SQL dialects only | [V] sequelize.org getting started |
| Server version and compose image | not checked | [?] |

## 4. Scaffold (official CLI first)
Create a MongoDB compose service with a pinned image, persistent volume, environment-supplied credentials and a healthcheck; verify the project configuration [?].

## 5. Install
Through Mongoose (`npm install mongoose`), see `orm/mongoose.md`.

## 6. Folder structure
No application folders.

## 7. package.json scripts
No migration CLI in the library: `db:migrate` has no MongoDB equivalent here; keep `db:seed` [?].

## 8. Config files
`DATABASE_URL=mongodb://127.0.0.1:2CNN/app_db` (Mongoose docs use `mongodb://127.0.0.1:27017/test` as the example URL) [V for the URL form].

## 9. Rules (MUST / MUST NOT)
- MUST keep UUID ids (FR-009): store a UUID string as `_id` instead of an ObjectId.
- MUST keep `created_at` / `updated_at` in UTC and snake_case field names in the database (FR-011), camelCase in JSON.
- MUST store money as integer rupiah.

## 10. Known pitfalls
- Prisma's MongoDB connector needs a replica set for transactions (prisma.io); not relevant with Mongoose, but relevant if you switch [V].
- `docs/CONVENTIONS.md` speaks of tables and columns: read them as collections and fields.

## 11. Prompt fragment
> Database is MongoDB, accessed with Mongoose. Use UUID strings as `_id` (FR-009), snake_case field names in the database with camelCase JSON, `created_at` / `updated_at` in UTC, money as integer rupiah. Configure the compose service and database scripts specifically for MongoDB.

## 12. Verification
| Claim | Mark | Evidence |
|---|---|---|
| Driver version and Node | [V] | `npm view mongodb` |
| No Prisma 7, no Sequelize support | [V] | prisma.io, sequelize.org |
| URL form | [V] | mongoosejs.com getting started |
| Compose image, migrations | [?] | not checked |

## 13. Sources
- https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/mongodb
- https://sequelize.org/docs/v6/getting-started/
- https://mongoosejs.com/docs/index.html
- `npm view mongodb`
