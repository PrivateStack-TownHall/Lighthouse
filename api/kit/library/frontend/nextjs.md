---
id: nextjs
name: Next.js (App Router)
category: frontend
status: partial
verified_on: 2026-11-23
versions:
  npm_latest: "16.4.6"
  recommended: "current major"
  kit_tested: "kit front end files typecheck; no Next.js app was built"
node: ">=20.9.0"
requires: []
conflicts_with: []
---
# Next.js (App Router)

## 1. What it is, in one line
React framework with server rendering and file-based routing. Port `5CNN`. Folder layout: `docs/ARCHITECTURE.md`.

## 2. Choose it when / do not choose it when
Choose for public, indexed pages or when you need server rendering. Choose Vite for pure dashboards.

## 3. Versions and requirements
| Item | Value | Source |
|---|---|---|
| next / create-next-app | 16.4.6 | `npm view` 2026-11-23 |
| Node | >=20.9.0 | [V] npm engines |

## 4. Scaffold (official CLI first)
```bash
npx create-next-app@latest <name>
```
The command is the official one but its prompts and generated files were not checked against the current docs [?]. Keep whatever the scaffold generates.

## 5. Install
`axios` and the packages of the chosen CSS document; `@tanstack/react-query` only if TanStack Query is selected. Implement shared API handling, error messages, query states and design tokens in the project as specified in the project guide.

## 6. Folder structure
`docs/ARCHITECTURE.md`. Same `features/`, `components/`, `lib/`, `helpers/`, `styles/` as Vite; only the routing layer differs.

## 7. package.json scripts
Configure `dev` as `next dev -p 5CNN`, preserve the scaffold build/start scripts and add real typecheck, lint and test commands.

## 8. Config files
`.env.local` with `NEXT_PUBLIC_API_URL=http://localhost:3CNN/api`. `src/app/globals.css` imports `styles/tokens.css`.

## 9. Rules (MUST / MUST NOT)
- MUST scaffold with `create-next-app`.
- MUST read the API URL from `NEXT_PUBLIC_API_URL`.
- MUST render a component with callbacks (e.g. `QueryState` with `onRetry`) from a Client Component.
- Pages and routes compose; `features/` owns data.

## 10. Known pitfalls
- Only `NEXT_PUBLIC_` variables reach the browser.
- Server and client code run in different places: keep tokens out of server logs.

## 11. Prompt fragment
> Scaffold with `npx create-next-app@latest`. Use the App Router under `src/app`. Put feature code in `src/features/<feature>`. Components that take callbacks must be Client Components. Port is 5CNN.

## 12. Verification
| Claim | Mark | Evidence |
|---|---|---|
| Version and Node | [V] | `npm view` 2026-11-23 |
| Scaffold prompts and defaults | [?] | not fetched |
| Shared infrastructure inside a Next.js app | [?] | not built |

## 13. Sources
- `npm view next create-next-app`
