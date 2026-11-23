# Definition of Done: Lighthouse – Contract Kit v1

Purpose: turn a project configuration into a consistent contract package (contract, architecture, prompts) assembled only from the Contract Kit library.
Category A1, NN 02: API 3102, UI 5102 (no database port: JSON files).

## Must-have features (v1 scope)
1. Project configuration in three accordions (Project Information, Technology Stack, Contract Rules) with presets, in one window.
2. Live compatibility check against the library (levels, messages, unverified claims, Custom Rule conflict hints).
3. Output selection and generation for all six outputs, including System Design and Development Standards.
4. Preview, copy, download, Export ZIP and Export MD.
5. Automatic save of the configuration in the JSON database; sign-in only when `AUTH_REQUIRED=true`.

## Done checklist
- [x] Follows the response contract (`contract-kit/docs/CONVENTIONS.md`)
- [x] Scripts match the standard (`dev`, `build`, `start`, `typecheck`, `lint`, `test`, `db:*`)
- [x] `.env.example` complete; env validated by Zod on boot
- [x] `/api/health`, `/api/version`, `/api/public` respond; `/monitoring` and `/activities` need ADMIN or STAFF
- [x] Swagger at `/api/docs` lists every endpoint
- [x] Tests pass: contract test (20), API tests (14), UI tests (12)
- [x] `typecheck` and `lint` are clean
- [x] `CHANGELOG.md` has a `1.0.0` entry
- [ ] Deployed, and the app registry row is updated (URL, repo link, ports)

## v1 freeze: parking lot (v1.1)
- Language per layer (API language and UI language): today one choice for both, so JavaScript + the TypeScript kit front end gives WARN.
- Generation history screen (the API already has `GET /api/generations`).
- User management screen (users are created by `npm run db:seed`).
- A list of saved projects (the API has `GET /api/projects`; the UI keeps one current project).
- Port group and NN in the form (generated documents show `3CNN` until assigned).
- Dark mode (tokens exist but are not reviewed).
- Brickhouse (Application Registry) is a separate app.
