# Changelog

All notable changes are documented here. Format: [Keep a Changelog](https://keepachangelog.com), versioning: [SemVer](https://semver.org).

## [Unreleased]

## [1.1.1] - 2026-11-23
### Changed
- Top bar: 84 px high (was 56 px), larger logo, more space around the title and between the bar and the panels.

## [1.1.0] - 2026-11-23
### Changed
- One-window layout on wide screens: the page does not scroll, each panel scrolls inside. Base font 14 px (`html { font-size: 87.5% }`).
- Top bar shows only the brand and the title (no profile, notifications, save or docs icons).
- Default project: "Lighthouse 123". Category is now the business category (LMS, CMS, E-commerce, ...); port groups A1/A2/A3 and NN are no longer asked (generated documents keep `3CNN` until assigned).
- Must-have features removed from the form; the generator writes a reusable feature step template instead.
- Technology choices use a select with a logo per technology (`ui/src/assets/tech/<id>.svg`, monogram until a file is added).
- Additional Tools and Always included removed from the form: Axios and TanStack Query are always used by web projects; Zod, ESLint, bcryptjs and JWT stay in the generated rules.
- The configuration is saved automatically in `database/projects.json` and restored on the next visit.
- Sign-in only when the API runs with `AUTH_REQUIRED=true` (default `false`).
### Added
- Library: MySQL, MongoDB, Mongoose (MongoDB needs it: Sequelize has no MongoDB dialect and Prisma 7 has no MongoDB support yet) and Bootstrap, with compatibility rules.

## [1.0.1] - 2026-11-23
### Changed
- Layout follows the mockup: top bar with the lighthouse scene (`ui/src/assets/brand/header-bg.webp`, cut from the supplied artwork at the 188 px band), two white panels on a navy-to-canvas background, field order of Project Information and Technology Stack, Additional Tools as a multi-select with chips, inline stepper, output rows with coloured tiles (the tile toggles the output), Export Package card.
- Project actions (save, saved projects, new, example) moved to the top bar and the projects drawer.
- The right panel stays in view while the left panel scrolls (wide screens).

## [1.0.0] - 2026-11-23
### Added
- Single-page Contract & Prompt Generator: Project Information, Technology Stack and Contract Rules accordions, presets, live compatibility check, output selection, generation, preview drawer, copy, download, Export ZIP and Export MD.
- Generator outputs: `PROJECT_CONTRACT.md`, `ARCHITECTURE.md`, `MASTER_PROMPT.md`, `PROMPTS/` (Contract Kit v1.3 library). `SYSTEM_DESIGN.md` and `DEVELOPMENT_STANDARDS.md` are listed as planned.
- Saved projects and generation history in a JSON database (`database/`).
- Auth contract (`/api/auth/login`, `/refresh`, `/me`), roles ADMIN / STAFF / USER, observability module, Swagger at `/api/docs`.
