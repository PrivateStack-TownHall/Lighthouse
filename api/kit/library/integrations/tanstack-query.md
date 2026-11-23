---
id: tanstack-query
name: TanStack Query
category: integration
status: draft
verified_on: 2026-11-23
versions:
  npm_latest: "5.108.3"
  recommended: "5.x"
  kit_tested: "none"
node: "n/a"
requires: []
conflicts_with: []
---
# TanStack Query

## 1. What it is, in one line
Server-state cache for React. `features/<feature>/hooks.ts` wrap it.

## 2. Choose it when / do not choose it when
Default for the front ends of the kit.

## 3. Versions and requirements
| Item | Value | Source |
|---|---|---|
| @tanstack/react-query | 5.108.3 | `npm view` 2026-11-23 |

## 4. Scaffold (official CLI first)
No scaffold.

## 5. Install
`npm i @tanstack/react-query`

## 6. Folder structure
`features/<feature>/hooks.ts`; provider in `app/providers.tsx`.

## 7. package.json scripts
None.

## 8. Config files
One `QueryClient` in the providers file.

## 9. Rules (MUST / MUST NOT)
- MUST call the API only through `features/<feature>/api.ts`.
- MUST render `isLoading`, `isError` and empty data with `QueryState`.

## 10. Known pitfalls
- `QueryState` is typechecked but not rendered with real queries yet [?].

## 11. Prompt fragment
> Server state uses TanStack Query in `features/<feature>/hooks.ts`. Components use `QueryState` for loading, error and empty.

## 12. Verification
| Claim | Mark | Evidence |
|---|---|---|
| Version | [V] | `npm view` 2026-11-23 |
| Use in the kit | [?] | only referenced in ARCHITECTURE.md |

## 13. Sources
- `npm view @tanstack/react-query`
