---
id: eslint
name: ESLint
category: tooling
status: partial
verified_on: 2026-11-23
versions:
  npm_latest: "eslint 10.15.0, typescript-eslint 8.73.0"
  recommended: "10.x"
  kit_tested: "none (lint was not run on the kit)"
node: "^20.19.0 || ^22.13.0 || >=24"
requires: []
conflicts_with: []
---
# ESLint

## 1. What it is, in one line
The linter for every app (decided: ESLint, not oxlint).

## 2. Choose it when / do not choose it when
Always.

## 3. Versions and requirements
| Item | Value | Source |
|---|---|---|
| eslint | 10.15.0 | `npm view` 2026-11-23 |
| typescript-eslint | 8.73.0 | `npm view` 2026-11-23 |
| Node | `^20.19.0 || ^22.13.0 || >=24` | [V] npm engines |

## 4. Scaffold (official CLI first)
`npm init @eslint/config@latest` is the official generator [?].

## 5. Install
`npm i -D eslint` (+ `typescript-eslint` for TypeScript)

## 6. Folder structure
`eslint.config.js` at the app root.

## 7. package.json scripts
`lint` in every template. Nest scaffold ships oxlint: replace it.

## 8. Config files
Flat config (`eslint.config.js`).

## 9. Rules (MUST / MUST NOT)
- MUST have a `lint` script that exits non-zero on errors.
- MUST NOT disable a rule without a comment saying why.

## 10. Known pitfalls
- The Nest scaffold generates an oxlint setup; remove it to avoid two linters [V: docs.nestjs.com lists `lint` as oxlint].

## 11. Prompt fragment
> Lint with ESLint (flat config). `npm run lint` must pass before finishing.

## 12. Verification
| Claim | Mark | Evidence |
|---|---|---|
| Version and Node | [V] | `npm view` 2026-11-23 |
| Init command | [?] | not fetched |
| Nest scaffold uses oxlint | [V] | docs.nestjs.com/first-steps |

## 13. Sources
- `npm view eslint typescript-eslint`
- https://docs.nestjs.com/first-steps
