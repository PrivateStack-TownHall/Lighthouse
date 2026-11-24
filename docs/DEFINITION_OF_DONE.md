# Definition of Done: Lighthouse

## Purpose and scope
Turn project information, a selected technology stack and project rules into consistent, self-contained implementation documents. Completion follows the agreed scope and verification evidence. A feature list and release-stage labels are not required.

## Acceptance criteria
- [ ] Project information, stack selection and custom rules can be configured, checked, saved and restored.
- [ ] Each selected output is generated consistently from the same configuration and library content.
- [ ] Every project package includes `docs/DEFINITION_OF_DONE.md`, project specifications, applicable implementation guidance and port instructions.
- [ ] Generated prompts describe code to implement in the target project and do not depend on an external source bundle.
- [ ] An absent or empty feature list is accepted. Optional feature details survive loading and saving; valid supplied details affect the output.
- [ ] FR-021 defines completion through scope-based acceptance criteria and verification evidence without a feature count or release freeze.
- [ ] Definition of Done matches frontend-only, backend-only or full-stack scope; unverified checks start unchecked.
- [ ] ZIP exports preserve generated files and text exactly. A prompts download includes its supporting specifications. Combined Markdown includes the Definition of Done.
- [ ] Invalid stack combinations and malformed supplied feature details are rejected; compatibility messages reflect actual documented constraints.
- [ ] Authentication, authorization, response envelopes and public-data restrictions continue to pass their existing checks.

## Verification
Run `npm test`, `npm run lint`, `npm run typecheck` and `node api/kit/library/validate.mjs`. Regression coverage must exercise projects with no feature list, optional supplied features, each project mode, custom folders, individually selected outputs and a ZIP round trip.

Before declaring an implementation complete, record the commands, exact results, any manual checks, remaining blockers and reasons for not-applicable criteria. Deployment is required only when included in the agreed scope. Generated documents alone do not prove an application has been implemented.

## Scope changes
Document the requested change, its acceptance criteria and affected checks before implementation. Keep exclusions separate from the requested work; no mandatory future-version buckets apply.
