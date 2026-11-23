# Technology library

One `.md` file per technology **choice**. Lighthouse reads these files instead of writing a document for every stack combination: pick the choices, include their files, and fill the gaps between them from `compatibility.json` and `combos/`.

```
library/
├─ _TEMPLATE.md             # copy this for a new choice
├─ core/core-rules.md       # Fixed Rules (FR-001 ...) for every project
├─ languages/               # javascript, typescript
├─ frontend/                # react-vite, nextjs
├─ css/                     # tailwindcss
├─ backend/                 # express, nestjs
├─ orm/                     # sequelize, prisma
├─ database/                # postgresql
├─ integrations/            # axios, jsonwebtoken, bcryptjs, zod, tanstack-query
├─ tooling/                 # eslint
├─ combos/                  # only what is true of a COMBINATION (wiring, open points)
├─ compatibility.json       # which choices fit together, at which level
├─ resolve.mjs              # prototype of Lighthouse "Generation Validation"
├─ generate.mjs             # the generator: config -> PROJECT_CONTRACT, ARCHITECTURE, MASTER_PROMPT, PROMPTS/ (see outputs/README.md)
├─ outputs/templates/       # fixed templates of the outputs
├─ presets/                 # stack presets for the Preset dropdown
├─ core/rule-hints.json     # patterns that flag a Custom Rule as a possible Fixed Rule conflict
├─ examples/                # example configs (vibedesk = the mockup)
├─ tests/                   # node --test "library/tests/*.test.mjs"
└─ validate.mjs             # structure check of this folder
```

Architecture, API contract, observability, ports and the design system are not duplicated here: they stay in `docs/` and the Core Rules point to them.

## How a document is chosen
`node library/resolve.mjs typescript react-vite tailwindcss nestjs prisma postgresql axios`

| Level | Meaning |
|---|---|
| `supported` | The Contract Kit has code or templates for this combination |
| `allowed` | No kit code; each member has docs; the glue is unverified |
| `warn` | Needs a conversion or has an open point |
| `unsupported` | The kit cannot produce it, or a choice has no document: ask for a correction, never invent |

## Verification marks (every claim carries one)
- `[V]` verified against an official page or `npm view`, with the source listed
- `[T]` exercised by the Contract Kit tests or typecheck
- `[?]` not verified: the generator must label it "unverified"

A file's `status` is `verified` (no `[?]`), `partial` (some `[?]`) or `draft`. `node library/validate.mjs` enforces this.

## Add a technology
1. Copy `_TEMPLATE.md` to `library/<category>/<id>.md` and fill all 13 sections. Get versions from `npm view <pkg> version`, and commands from the official docs (put the URL in Sources).
2. Add the id to `compatibility.json` (`choices` or `tools`), plus a rule for every pair that does not simply work.
3. Only if the pairing has its own wiring or open points: add `combos/<a>-<b>.md`.
4. Run `node library/validate.mjs`.

## Versions in this library
Checked on 2026-11-23 with `npm view`. Re-check before relying on a number; `verified_on` in each file shows how old it is.
Two surprises worth knowing: the npm `latest` tag of `prisma` is a Prisma 8 release candidate (pin `prisma@7`), and the current Nest scaffold ships oxlint (the decision here is ESLint).
