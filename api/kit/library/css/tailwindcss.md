---
id: tailwindcss
name: Tailwind CSS
category: css
status: partial
verified_on: 2026-11-23
versions:
  npm_latest: "4.3.5"
  recommended: "4.x"
  kit_tested: "tokens.css not compiled through Tailwind here"
node: "n/a"
requires: []
conflicts_with: []
---
# Tailwind CSS

## 1. What it is, in one line
Utility-first CSS. The kit expresses design tokens in Tailwind v4 `@theme` (CSS-first).

## 2. Choose it when / do not choose it when
Choose with Vite or Next.js for any app that follows `docs/DESIGN_SYSTEM.md`.

## 3. Versions and requirements
| Item | Value | Source |
|---|---|---|
| tailwindcss / @tailwindcss/vite | 4.3.5 | `npm view` 2026-11-23 |

## 4. Scaffold (official CLI first)
No scaffold. Install the packages; there is no `init` step in the Vite guide.

## 5. Install
```bash
npm install tailwindcss @tailwindcss/vite
```

## 6. Folder structure
`src/styles/tokens.css` is the only file with raw colors.

## 7. package.json scripts
No scripts.

## 8. Config files
`vite.config.ts`:
```ts
import { defineConfig } from "vite"
import tailwindcss from "@tailwindcss/vite"
export default defineConfig({ plugins: [tailwindcss()] })
```
CSS entry: `@import "tailwindcss";` (add it to the project stylesheet).
- Next.js: the setup differs; use the Next.js framework guide [?].

## 9. Rules (MUST / MUST NOT)
- MUST define colors and fonts as tokens in `tokens.css` (`docs/DESIGN_SYSTEM.md`).
- MUST NOT write raw hex in components.
- MUST pick the brand scale per app; `tokens.lighthouse.css` is a worked example.

## 10. Known pitfalls
- `@theme` variable names create utilities (e.g. `--color-brand-600` -> `bg-brand-600`); renaming a token renames the utility [?].
- Verify token contrast and actual browser rendering in the project.

## 11. Prompt fragment
> Use Tailwind CSS v4 with `@tailwindcss/vite`. All colors come from the tokens in `src/styles/tokens.css`; never write raw hex in components.

## 12. Verification
| Claim | Mark | Evidence |
|---|---|---|
| Vite install steps | [V] | tailwindcss.com/docs/installation |
| Version | [V] | `npm view` 2026-11-23 |
| Next.js setup | [?] | framework guide not fetched |
| tokens.css compiles in Tailwind | [?] | not compiled |

## 13. Sources
- https://tailwindcss.com/docs/installation
- `npm view tailwindcss @tailwindcss/vite`
