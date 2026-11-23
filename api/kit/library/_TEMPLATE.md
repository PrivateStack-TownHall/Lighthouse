---
# Copy this file to library/<category>/<id>.md and fill every field. One file = one choice.
id: kebab-case-id                 # unique, used by compatibility.json and the generator
name: Display Name
category: language | frontend | css | backend | orm | database | integration | tooling
status: draft                     # draft | partial | verified  (see "Verification" below)
verified_on: YYYY-MM-DD
versions:
  npm_latest: ""                  # from `npm view <pkg> version`, with the date above
  recommended: ""                 # the line you tell people to use (may differ from latest)
  kit_tested: ""                  # what the Contract Kit tests/typecheck actually ran against, or "none"
node: ""                          # engines.node of the package, or "n/a"
requires: []                      # other ids that must be selected
conflicts_with: []                # ids that must not be selected together
---

# Display Name

## 1. What it is, in one line

## 2. Choose it when / do not choose it when

## 3. Versions and requirements
| Item | Value | Source |
|---|---|---|

## 4. Scaffold (official CLI first)
```bash
# the official command; never recreate an official structure by hand
```

## 5. Install

## 6. Folder structure
Point to the section of `docs/ARCHITECTURE.md`. Describe only what differs.

## 7. package.json scripts
Point to the `templates/package-scripts.*.json` file. Describe only what differs.

## 8. Config files

## 9. Rules (MUST / MUST NOT)
Short, checkable, stack-specific. The generator copies these into `PROJECT_CONTRACT.md` and `DEVELOPMENT_STANDARDS.md`.

## 10. Known pitfalls

## 11. Prompt fragment
Text the generator adds to `MASTER_PROMPT.md` when this choice is selected. Facts only; no invented flags or versions.

## 12. Verification
Mark every claim above:
- `[V]` verified against an official page (give the URL in Sources) or `npm view`
- `[T]` exercised by the Contract Kit tests or typecheck
- `[?]` from experience, not verified: the generator must label it "unverified"

| Claim | Mark | Evidence |
|---|---|---|

## 13. Sources
