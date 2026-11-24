---
id: bootstrap
name: Bootstrap
category: css
status: partial
verified_on: 2026-11-23
versions:
  npm_latest: "5.3.9 (next: 6.0.0-alpha.1)"
  recommended: "5.x"
  kit_tested: "none"
node: "n/a"
requires: []
conflicts_with: []
---
# Bootstrap

## 1. What it is, in one line
Component CSS framework (Sass) with optional JavaScript plugins.

## 2. Choose it when / do not choose it when
Choose when the team works with Bootstrap components. The kit design tokens are written for Tailwind CSS, so Bootstrap needs a token mapping.

## 3. Versions and requirements
| Item | Value | Source |
|---|---|---|
| bootstrap | 5.3.9 | [V] `npm view bootstrap` 2026-11-23 |
| @popperjs/core | 2.11.8 (peer, for dropdowns, popovers, tooltips) | [V] npm, getbootstrap.com Vite guide |
| sass | 1.108.2 (dev, to import Bootstrap's Sass) | [V] npm, Vite guide |

## 4. Scaffold (official CLI first)
No scaffold. Install into the Vite or Next.js app.

## 5. Install
```bash
npm i --save bootstrap @popperjs/core
npm i --save-dev sass
```
From the official Vite guide [V].

## 6. Folder structure
`src/styles/styles.scss` imports Bootstrap; `src/styles/tokens.css` keeps the semantic tokens (`docs/DESIGN_SYSTEM.md`).

## 7. package.json scripts
No scripts.

## 8. Config files
- Vite: `src/scss/styles.scss` with `@import "bootstrap/scss/bootstrap";`, imported from the entry file; JS with `import * as bootstrap from 'bootstrap'` or single plugins (`import { Tooltip } from 'bootstrap'`) [V].
- Next.js: setup not fetched [?].

## 9. Rules (MUST / MUST NOT)
- MUST map the semantic tokens of `docs/DESIGN_SYSTEM.md` (primary, destructive, background, ...) to Bootstrap's Sass or CSS variables in one file; components MUST NOT use raw hex.
- MUST import only the Bootstrap JS plugins that are used.
- MUST NOT mix Bootstrap with Tailwind CSS in one app.

## 10. Known pitfalls
- Define semantic tokens as CSS variables or Sass variables for Bootstrap; do not use Tailwind `@theme` directives.
- Sass prints deprecation warnings for Bootstrap 5.3; the guide shows how to silence them, they do not stop the build [V].

## 11. Prompt fragment
> Use Bootstrap 5.3 with Sass: `npm i bootstrap @popperjs/core` and `npm i -D sass`, import `bootstrap/scss/bootstrap` from `src/styles/styles.scss`. Map the design-system tokens to Bootstrap variables in one place; no raw hex in components. Import only the JS plugins you use.

## 12. Verification
| Claim | Mark | Evidence |
|---|---|---|
| Install, Sass import, JS import, deprecation note | [V] | getbootstrap.com/docs/5.3/getting-started/vite |
| Versions | [V] | `npm view` 2026-11-23 |
| Next.js setup | [?] | not fetched |
| Token mapping works with the project components | [?] | not tried |

## 13. Sources
- https://getbootstrap.com/docs/5.3/getting-started/vite/
- `npm view bootstrap @popperjs/core sass`
