---
id: javascript
name: JavaScript (ESM)
category: language
status: partial
verified_on: 2026-11-23
versions:
  npm_latest: "n/a"
  recommended: "ES2022+, ES modules"
  kit_tested: "Express kit code, 20 tests on Node (ESM)"
node: "see backend/frontend choice"
requires: []
conflicts_with: []
---
# JavaScript (ESM)

## 1. What it is, in one line
Plain JavaScript with ES modules (`"type": "module"`). The Contract Kit Express code is written this way.

## 2. Choose it when / do not choose it when
Choose for Express APIs and small tools where speed matters more than types. Do not choose it for NestJS (the kit has no JavaScript Nest code) or for the kit front end files, which are `.ts` / `.tsx`.

## 3. Versions and requirements
| Item | Value | Source |
|---|---|---|
| Module system | ESM (`import` / `export`) | [T] kit Express tests pass as ESM |
| Node | Depends on the other choices: see `compatibility.json` and the backend/frontend documents | [V] engines from npm |

## 4. Scaffold (official CLI first)
No scaffold. `npm init -y`, then set `"type": "module"`.

## 5. Install
Nothing to install.

## 6. Folder structure
No `types/` folder. `helpers/index.js` exists from the first commit in the API and in the front end (`docs/ARCHITECTURE.md` section 7).

## 7. package.json scripts
`typecheck` has no compiler in plain JS. `templates/package-scripts.backend-express-sequelize.json` points it at `scripts/check-source.js` (a syntax check). Write that file in the app; the kit does not ship it.

## 8. Config files
`package.json` with `"type": "module"`. Imports in the API need the `.js` extension (`import x from "./x.js"`).

## 9. Rules (MUST / MUST NOT)
- MUST use ES modules; MUST NOT mix `require` and `import` in one file.
- MUST add the `.js` extension to relative imports.
- MUST keep the response contract identical to TypeScript apps: `docs/CONVENTIONS.md`.
- MUST describe request and response shapes in the Swagger document, since there are no types to read.
- MUST NOT create a `types/` folder.

## 10. Known pitfalls
- `sequelize-cli` loads migrations with `require`. In an ESM project they normally have to be `.cjs` files [?]. See `combos/express-sequelize-postgresql.md`.
- `__dirname` does not exist in ESM; use `import.meta.url`.

## 11. Prompt fragment
> Write plain JavaScript with ES modules (`"type": "module"`), relative imports with the `.js` extension, no TypeScript syntax, no `types/` folder. Keep `helpers/index.js` for small pure functions.

## 12. Verification
| Claim | Mark | Evidence |
|---|---|---|
| Kit Express code runs as ESM | [T] | `express/tests/contract.test.js`, 20 pass |
| `.cjs` migrations needed with sequelize-cli | [?] | From experience; try it on the first Express app |

## 13. Sources
- Contract Kit `express/` (tests)
