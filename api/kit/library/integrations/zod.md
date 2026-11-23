---
id: zod
name: Zod
category: integration
status: verified
verified_on: 2026-11-23
versions:
  npm_latest: "4.6.7"
  recommended: "4.x"
  kit_tested: "4.6.7 (Express 20 tests, Nest smoke, strict typecheck). The first kit version declared `^3.25`."
node: "n/a"
requires: []
conflicts_with: []
---
# Zod

## 1. What it is, in one line
Schema validation for env, request bodies, queries and params, in every app (Nest too).

## 2. Choose it when / do not choose it when
Always.

## 3. Versions and requirements
| Item | Value | Source |
|---|---|---|
| zod | 4.6.7 | `npm view` 2026-11-23 |
| Kit on zod 4.6.7 | all checks pass | [T] 2026-11-23 |

## 4. Scaffold (official CLI first)
No scaffold.

## 5. Install
`npm i zod`

## 6. Folder structure
Express: `modules/<feature>/<feature>.schema.js`. Nest: `dto/*.dto.ts` (schema + inferred type). Env: `common/config/env`.

## 7. package.json scripts
None.

## 8. Config files
None.

## 9. Rules (MUST / MUST NOT)
- MUST validate env at boot (`common/config/env`).
- MUST validate every body, query and params.
- MUST infer TypeScript types with `z.infer`.
- MUST NOT duplicate a schema as a class and as Zod.

## 10. Known pitfalls
- Swagger request bodies are not generated from Zod in v1 (parked: `nestjs-zod`).

## 11. Prompt fragment
> Validate with Zod everywhere: env at boot, request bodies, queries and params. Infer types from schemas. Failures become 400 VALIDATION_ERROR with `details[].path` and `message`.

## 12. Verification
| Claim | Mark | Evidence |
|---|---|---|
| Kit works on Zod 4.6.7 | [T] | Express tests + Nest smoke |
| Version | [V] | `npm view` 2026-11-23 |

## 13. Sources
- `npm view zod`
- Contract Kit tests
