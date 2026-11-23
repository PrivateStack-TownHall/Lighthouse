---
id: mongoose
name: Mongoose
category: orm
status: draft
verified_on: 2026-11-23
versions:
  npm_latest: "9.12.3 (depends on mongodb ~7.8)"
  recommended: "9.x"
  kit_tested: "none"
node: ">=20.19.0"
requires: ["mongodb"]
conflicts_with: []
---
# Mongoose

## 1. What it is, in one line
Object data modelling for MongoDB: schemas, models, validation and queries.

## 2. Choose it when / do not choose it when
Choose with MongoDB (the only MongoDB option in this library). Do not choose it for SQL databases.

## 3. Versions and requirements
| Item | Value | Source |
|---|---|---|
| mongoose | 9.12.3 | [V] `npm view mongoose` 2026-11-23 |
| Node | >= 20.19.0 | [V] npm engines |
| Docs version | v9.12.3 | [V] mongoosejs.com/docs |

## 4. Scaffold (official CLI first)
No scaffold: `npm install mongoose` [V].

## 5. Install
`npm install mongoose` [V].

## 6. Folder structure
Express: `src/database/models/<model>.js` (one schema per model); no `migrations/` folder [?]. Nest: a Nest-specific Mongoose package exists but is not documented here [?].

## 7. package.json scripts
No migration CLI; `db:seed` runs a seed script [?].

## 8. Config files
Connect once at boot: `await mongoose.connect(process.env.DATABASE_URL)` (the getting-started page shows `mongoose.connect('mongodb://127.0.0.1:27017/test')`) [V].

## 9. Rules (MUST / MUST NOT)
- MUST connect once at boot and reuse the connection.
- MUST define a schema per model and keep validation of requests in Zod (Zod everywhere, FR-014).
- MUST use UUID strings as `_id` (FR-009) and `timestamps` mapped to `created_at` / `updated_at` [?].
- MUST probe the database for observability with a cheap command (e.g. a ping) [?].

## 10. Known pitfalls
- Two validation layers (Mongoose schema and Zod) can drift: requests are validated by Zod; the schema guards the database.

## 11. Prompt fragment
> Use Mongoose 9 with MongoDB. Connect once at boot with `mongoose.connect(DATABASE_URL)`. One schema per model in `src/database/models`. UUID strings as `_id`, `created_at` / `updated_at` in UTC. Validate requests with Zod, not only with the Mongoose schema.

## 12. Verification
| Claim | Mark | Evidence |
|---|---|---|
| Install and connect | [V] | mongoosejs.com/docs |
| Version and Node | [V] | `npm view mongoose` |
| Folder layout, timestamps mapping, ping probe, Nest package | [?] | not checked |

## 13. Sources
- https://mongoosejs.com/docs/index.html
- `npm view mongoose`
