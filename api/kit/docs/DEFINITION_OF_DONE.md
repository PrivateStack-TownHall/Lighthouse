# Definition of Done (v1)

Write the scope for v1 **before** starting. When every box is checked, v1 is done. That is a fact, not a decision to re-make.

## Before starting
- [ ] One-line purpose and 3-7 must-have features written down
- [ ] Category (A1/A2/A3), NN and ports assigned (`docs/PORTS.md`)
- [ ] Only one new app is in progress at a time

## Done checklist
- [ ] Follows the response contract (`docs/CONVENTIONS.md`)
- [ ] Scripts match the standard (`dev`, `build`, `typecheck`, `lint`, `test`, `db:*`)
- [ ] `.env.example` complete; env validated by Zod on boot
- [ ] `/api/health`, `/api/version`, `/api/public` respond
- [ ] Swagger at `/api/docs` is complete
- [ ] Tests pass: contract test, auth test, one e2e happy path
- [ ] `typecheck` and `lint` are clean
- [ ] `CHANGELOG.md` has a `1.0.0` entry
- [ ] Deployed, and the app registry row is updated (URL, repo link, ports)

## v1 freeze
- v1 is **not redesigned** after this checklist is green.
- Every new idea goes to the parking list below, not into v1.
- Ideas are reviewed only after v1 is released.

## v1.1 parking lot
- (idea)
