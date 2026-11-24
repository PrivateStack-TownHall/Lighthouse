---
id: react-vite
name: React + Vite
category: frontend
status: partial
verified_on: 2026-11-23
versions:
  npm_latest: "react 19.3.1, vite 8.3.8, @vitejs/plugin-react 6.3.0"
  recommended: "current majors"
  kit_tested: "kit front end files typecheck (strict); not run in a browser"
node: "^20.19.0 || >=22.12.0 (vite 8)"
requires: []
conflicts_with: []
---
# React + Vite

## 1. What it is, in one line
Single-page React app built with Vite. Port `5CNN`. Folder layout: `docs/ARCHITECTURE.md`.

## 2. Choose it when / do not choose it when
Choose for dashboards and tools behind a login, where server rendering and SEO do not matter. Choose Next.js instead for public, indexed pages.

## 3. Versions and requirements
| Item | Value | Source |
|---|---|---|
| react / react-dom | 19.3.1 | `npm view` 2026-11-23 |
| vite | 8.3.8 | `npm view` 2026-11-23 |
| @vitejs/plugin-react | 6.3.0 | `npm view` 2026-11-23 |
| create-vite | 9.3.4 | `npm view` 2026-11-23 |
| Node | `^20.19.0 || >=22.12.0` | [V] vite.dev guide and npm engines |
| Templates | `react`, `react-compiler`, `react-ts`, `react-compiler-ts` | [V] vite.dev guide |

## 4. Scaffold (official CLI first)
```bash
npm create vite@latest <name> -- --template react-ts   # the extra -- is required on npm 7+
```
Use `react` instead of `react-ts` for plain JavaScript.

## 5. Install
`npm install`, then the packages of the chosen CSS document and the selected tools (`axios`; `@tanstack/react-query` only if TanStack Query is selected). Implement shared API handling, error messages, query states and design tokens in the project as specified in the project guide.

## 6. Folder structure
`docs/ARCHITECTURE.md`: `app/`, `pages/`, `features/<feature>/`, `components/`, `lib/`, `helpers/`, `styles/`.

## 7. package.json scripts
Keep the scaffold `dev`, `build` and `preview` scripts; configure `typecheck`, `lint`, `test` and `start` with real commands for the chosen language and runner.

## 8. Config files
`.env` with `VITE_API_URL=http://localhost:3CNN/api`. `vite.config.ts` with the Tailwind plugin. Dev server port from `docs/PORTS.md`: `vite --port 5CNN`.

## 9. Rules (MUST / MUST NOT)
- MUST scaffold with `create vite`; MUST NOT hand-write the Vite config structure.
- MUST call the API only through `lib/api-client.ts`; components MUST NOT call axios.
- MUST use semantic tokens only (`docs/DESIGN_SYSTEM.md`), never raw hex.
- MUST render loading, empty and error states with `QueryState`.
- MUST read the API URL from `VITE_API_URL`.

## 10. Known pitfalls
- Only variables that start with `VITE_` reach the browser.
- Check the implemented `QueryState` and error-message mapping in a browser; typechecking alone does not verify rendering.

## 11. Prompt fragment
> Scaffold with `npm create vite@latest <name> -- --template react-ts`. Follow the folder layout in `docs/ARCHITECTURE.md`. Data access only in `features/<feature>/api.ts` through `lib/api-client.ts`. Port is 5CNN. Node must satisfy `^20.19.0 || >=22.12.0`.

## 12. Verification
| Claim | Mark | Evidence |
|---|---|---|
| Scaffold command and templates | [V] | vite.dev/guide |
| Node requirement | [V] | vite.dev guide, npm engines |
| Kit front end typechecks | [T] | tsc strict |
| Runs in a browser | [?] | not tried |
| Package versions | [V] | `npm view` 2026-11-23 |

## 13. Sources
- https://vite.dev/guide/
- `npm view vite react @vitejs/plugin-react create-vite`
