---
id: express
name: Express
category: backend
status: partial
verified_on: 2026-11-23
versions:
  npm_latest: "5.3.0 (4.x line: 4.22.3)"
  recommended: "5.x"
  kit_tested: "5.3.0 (20 tests); the first kit version ran on 4.21"
node: ">=18"
requires: []
conflicts_with: []
---
# Express

## 1. What it is, in one line
Minimal Node HTTP framework. The kit gives it the same contract, folders and observability as NestJS.

## 2. Choose it when / do not choose it when
Choose for small and medium APIs. Choose NestJS for large APIs with many modules and several contributors.

## 3. Versions and requirements
| Item | Value | Source |
|---|---|---|
| express | 5.3.0 (`latest`), 4.22.3 (`latest-4`) | `npm view` 2026-11-23 |
| Node | >=18 | [V] npm engines |
| Kit on Express 5.3.0 + Zod 4.6.7 | 20 / 20 tests pass | [T] 2026-11-23 |

## 4. Scaffold (official CLI first)
There is no official Express scaffold that matches this layout. Do `npm init -y`, install, and copy `express/src/*` from the kit. (`express-generator` exists but creates a legacy layout [?].)

## 5. Install
`npm i express cors zod` and `npm i -D eslint`. Auth: `jsonwebtoken`, `bcryptjs`. Database: see `sequelize.md` or `prisma.md`.

## 6. Folder structure
`docs/ARCHITECTURE.md` section 2: `src/common/*`, `src/observability/`, `src/modules/<feature>/{routes,controller,service,schema}`, `tests/`.

## 7. package.json scripts
`templates/package-scripts.backend-express-sequelize.json`.

## 8. Config files
`.env` from `templates/env.example`, validated at boot by `common/config/env.js` (Zod).

## 9. Rules (MUST / MUST NOT)
- MUST be ES modules (see `javascript.md`).
- MUST register `requestId` first and `errorHandler` last (`app.example.js`).
- MUST answer with `sendSuccess` / `sendCreated` / `sendPaginated` / `sendError`; MUST NOT call `res.json` directly.
- MUST validate every body, query and params with `validate(schema, where)`; read `req.valid`.
- MUST use functions (not classes) for controller and service; the split stays.
- MUST pass `access` to `createObservabilityRouter`.

## 10. Known pitfalls
- Controllers return nothing but `send*` calls; services return raw data and throw `AppError`.
- Do not export `{ data }` from a service: the contract wraps it once.

## 11. Prompt fragment
> Use Express (ESM). Follow ARCHITECTURE.md section 2: `src/common`, `src/observability`, `src/modules/<feature>` with routes, controller, service and Zod schema. Respond only through the helpers in `common/contract/response.js`. Validate with `validate(schema, "body"|"query"|"params")`. Node >= 18.

## 12. Verification
| Claim | Mark | Evidence |
|---|---|---|
| Contract, validation, pagination, errors, observability, access rules | [T] | `express/tests`, 20 pass on 5.3.0 / Zod 4.6.7 |
| Versions and Node | [V] | `npm view` 2026-11-23 |
| express-generator layout | [?] | from experience |

## 13. Sources
- `npm view express`
- Contract Kit `express/tests`
