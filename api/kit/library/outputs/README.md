# Generator outputs (fixed templates)

`node library/generate.mjs <config.json> <out-dir> [--md <file.md>]` turns one Lighthouse configuration into a project package. The structure of every output is fixed by the templates in `templates/`; the content comes from the internal specifications and config. Same config + same library content = same bytes. Exported documents are self-contained and carry their supporting specifications under `docs/`.

| Output | Status | Template |
|---|---|---|
| `PROJECT_CONTRACT.md` | implemented | `templates/PROJECT_CONTRACT.md` |
| `ARCHITECTURE.md` | implemented | `templates/ARCHITECTURE.md` |
| `MASTER_PROMPT.md` | implemented | `templates/MASTER_PROMPT.md` |
| `PROMPTS/` | implemented | `templates/prompts/00-INDEX.md` + `templates/prompts/step.md` |
| `SYSTEM_DESIGN.md` | implemented | `templates/SYSTEM_DESIGN.md` |
| `DEVELOPMENT_STANDARDS.md` | implemented | `templates/DEVELOPMENT_STANDARDS.md` |

Every non-empty output selection includes `docs/DEFINITION_OF_DONE.md`, project specifications and applicable stack references. Feature details are optional; without them the implementation step follows the project description and custom rules. FR-021 uses acceptance criteria and verification evidence with no release-stage freeze.

Every run also writes `lighthouse.config.json` (to regenerate) and `lighthouse.manifest.json` (hash, level, documents used, unverified counts).

## The standard is the same; the stack decides where it lives
`PROJECT_CONTRACT.md` sections 1, 3, 4, 5, 6 and 8 are **identical for every stack** (a test enforces it). Only section 2 (stack), 7 (which file implements each part) and 9 (unverified) change. `ARCHITECTURE.md` uses the same folder names and layers everywhere; the trees are taken from `docs/ARCHITECTURE.md` for the chosen backend and frontend, with the project's features filled in and the file extensions of the chosen language.

## PROJECT_CONTRACT.md (always in this order)
1 Project information (name, type, purpose, version, category, repository, ports) · 2 Technology stack + compatibility · 3 Project scope · 4 API contract (envelope and error codes, endpoints, query, auth, observability shapes) · 5 Data conventions + tables · 6 Fixed and custom rules · 7 Where the contract lives in this stack · 8 Definition of Done · 9 Unverified

## ARCHITECTURE.md (always in this order)
Summary · 1 System overview (Mermaid + ports) · 2 Repository layout · 3 Backend (folders with the features, layers, request lifecycle, stack notes) · 4 Frontend (folders, rules, data flow, styling, stack notes; not for A2) · Naming · Same job, same place · `common/` vs `helpers/` · Unverified

## MASTER_PROMPT.md (10 sections, always in this order)
1 Role · 2 Project (+ scope and exclusions) · 3 Technology stack · 4 Compatibility · 5 Ports and environment · 6 Fixed Rules · 7 Stack instructions (section 11 + section 9 of each selected document, the combo wiring) · 8 Custom rules · 9 Unverified (every `[?]` of the included documents) · 10 How to work

## PROMPTS/ (one file per step)
`00-INDEX` · `01-scaffold` · `02-api-foundation` · `03-database` · `04-auth` · `05-ui-foundation` (not for A2) · one `feature-<resource>` per feature · `verification`.
Every step has the same headings: Goal, Read first, Do, Acceptance criteria, Do not, Unverified in this step, Report back.

## Config (`examples/example-cms.config.json`)
| Field | Rule |
|---|---|
| `schemaVersion` | `1` |
| `generatedOn` | `YYYY-MM-DD`; the generator never reads the clock |
| `preset` | `custom` or an id from `presets/` (a changed stack gives a warning) |
| `project` | `name`, `slug` (kebab-case), `type` (`web-app`, or `api` for category 2), `category` 1/2/3, `nn` 1-99, `purpose` (`commercial`, `internal`, `personal`, `portfolio`, `learning`), `version` (semver), `description` (max 300), optional `features` (no required count: `name`, `description`, optional `resource` and `access.read/write`), optional `parkingLot` |
| `stack` | `language`, `frontend`, `css` (empty for A2), `backend`, `orm`, `database`, `tools`, optional `versions` (`{ "express": "5" }`) |
| `customRules` | `text`, optional `overrides` (Fixed Rule ids) + `reason` (required when overriding) |
| `outputs` | subset of the implemented outputs |

For a concrete FR-015 port override, put `API: 3200`, `DB: 2200` and, when applicable, `UI: 5200` on separate lines in the rule text. These values replace port markers throughout the generated project documents. An invalid or conflicting port assignment stops generation.
`project.folders.api` and `project.folders.ui` name the backend and frontend root folders. Changing either name keeps its role; FR-017 overrides are for changes to the internal architecture.

## Validation
| Situation | Result |
|---|---|
| Every document present | generate |
| Some claims `[?]` / a draft document | generate; list them in MASTER_PROMPT section 9 and in each step |
| Version outside the recommended major | stop: ask for another version |
| Combination with a rule (`compatibility.json`) | `warn` / `allowed`: generate with the message |
| Unknown choice or tool, missing required choice, tool without its required layer | stop: never invent |
| Custom Rule matching `core/rule-hints.json` | warning: reword it or declare `overrides` |
| Custom Rule overriding a Fixed Rule without `reason` | stop |

Defaults that are generator decisions (review them): feature access `read: ADMIN, STAFF, USER`, `write: ADMIN, STAFF`; update uses `PATCH`; delete answers `data: null`.
