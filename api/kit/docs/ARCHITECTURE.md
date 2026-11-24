# Folder architecture

Four stacks, one mental model. The same words mean the same thing in every stack:

| Name | Meaning |
|---|---|
| `common/` | Shared plumbing of an API (contract, filters, middleware, pagination, config). Never contains business logic. |
| `modules/<feature>/` | One folder per business feature in an API. |
| `observability/` | The standard module (`/api/health`, `/monitoring`, `/activities`, `/version`, `/public`). See `docs/OBSERVABILITY.md`. |
| `features/<feature>/` | One folder per business feature in a front end. |
| `lib/` | Front-end plumbing (`api-client`, error messages). |
| `helpers/` | Small **pure** functions (format, slug, mask). No I/O, no framework imports, no business rules. In the API and in the front end. |

**Applies to new projects only.** Existing projects are frozen and are touched only when they need a fix.

> **What is observed vs. proposed.** From the scan of 66 projects: NestJS repos are already uniform (`src/` in all 14, `prisma/` and `test/` in 13), and `src/common/swagger`, `src/common/scope`, `src/prisma`, `src/observability` exist in the reference repos. Express repos are not uniform (folders per type, `middlewares` vs `middleware`, `tests` vs `test` vs `__tests__`). Front ends: Vite = `src/` + `public/`; Next.js = `src/app` or root `app`, plus `features`, `components`, `lib`. The scan saw only top-level folders, so everything inside `src/` below is a **proposal** built on those hints, not a copy of your repos. Where your Nest repos keep feature modules today (`src/<feature>` or `src/modules/<feature>`) was not visible; this standard picks `src/modules/<feature>`.

---

## 0. Repo layout of one app

```
<app>/                         # A1 / A3 (API + UI)          A2 (API only): the API is the repo root
├─ api/                        # NestJS or Express
├─ ui/                         # Vite React or Next.js
├─ docs/                       # app-level docs (below)
├─ docker-compose.yml          # profiles: db, api, ui
├─ .env.docker                 # ports from docs/PORTS.md
├─ package.json                # delegating scripts only
├─ CHANGELOG.md
└─ README.md
```

`docs/` in every app: `DEFINITION_OF_DONE.md`, `api-contract.md` (+ `openapi.json` exported from Swagger), `architecture.md` (only what differs from this standard), `design-system.md`.

---

## 1. NestJS + Prisma

```
api/
├─ prisma/
│  ├─ schema.prisma
│  ├─ migrations/
│  └─ seed.ts
├─ scripts/
│  └─ create-database.mjs         # used by db:create
├─ src/
│  ├─ main.ts                     # bootstrap (see nest/src/main.example.ts)
│  ├─ app.module.ts
│  ├─ common/
│  │  ├─ auth/                    # types, guards, decorators (@Roles, @CurrentUser)
│  │  ├─ config/env.ts            # Zod-validated env
│  │  ├─ contract/envelope.ts     # ApiSuccess, ApiFailure, Paginated, ApiResult
│  │  ├─ filters/                 # HttpExceptionFilter
│  │  ├─ interceptors/            # ResponseInterceptor
│  │  ├─ middlewares/             # requestId
│  │  ├─ pagination/
│  │  ├─ pipes/                   # ZodValidationPipe
│  │  ├─ scope/                   # ONLY when several APIs share one database (see below)
│  │  └─ swagger/                 # ApiOkEnvelope, ApiListEnvelope, ApiPaginatedEnvelope
│  ├─ helpers/index.ts            # maskName, maskEmail, slugify, toIsoUtc (implement in the project)
│  ├─ prisma/                     # prisma.module.ts, prisma.service.ts
│  ├─ observability/              # standard module (implement in the project)
│  └─ modules/
│     └─ <feature>/               # kebab-case, plural: products, order-items
│        ├─ <feature>.module.ts
│        ├─ <feature>.controller.ts
│        ├─ <feature>.service.ts
│        ├─ <feature>.service.spec.ts     # unit tests sit next to the code
│        └─ dto/
│           └─ create-<feature>.dto.ts    # Zod schema + inferred type
├─ test/
│  ├─ jest-e2e.json
│  └─ <feature>.e2e-spec.ts       # at least: contract, auth, one happy path
├─ Dockerfile
├─ .env.example
└─ package.json
```

Rules
- A controller only parses input and calls a service. A service holds the logic and returns **raw values** (never `{ data }`; the interceptor builds the envelope).
- Lists return `new Paginated(items, buildPagination(...))`; not-found throws `NotFoundException` (404), it never returns `{ data: null }`.
- `common/scope/` exists only for the commerce-core / operations-core style of **one database shared by several APIs**: it holds the `where` fragments (e.g. `productScope`) that keep each API to its own rows.

## 2. Express + Sequelize

The Express application uses ESM (`"type": "module"`). It mirrors the Nest layout: the same `common/` and `observability/` names, feature modules instead of folders per type.

```
api/
├─ src/
│  ├─ server.js                   # listen() only
│  ├─ app.js                      # createApp() (see express/src/app.example.js)
│  ├─ common/
│  │  ├─ config/env.js
│  │  ├─ contract/response.js     # sendSuccess, sendCreated, sendPaginated, sendError, AppError
│  │  ├─ middlewares/             # request-id, error-handler, validate, auth
│  │  └─ pagination/
│  ├─ helpers/index.js            # implement in the project
│  ├─ database/
│  │  ├─ models/
│  │  ├─ migrations/
│  │  └─ seeders/
│  ├─ observability/              # observability.router.js (implement in the project)
│  └─ modules/
│     └─ <feature>/
│        ├─ <feature>.routes.js
│        ├─ <feature>.controller.js
│        ├─ <feature>.service.js
│        └─ <feature>.schema.js   # Zod
├─ tests/
│  └─ <feature>.test.js           # node --test; mirrors modules/
├─ docs/
├─ .env.example
└─ package.json
```

Rules
- Same split as Nest: routes wire, controller parses and responds with `send*`, service returns raw data and throws `AppError`.
- Wrap async handlers with `asyncHandler`, validate with `validate(schema, 'body' | 'query' | 'params')`, read the parsed value from `req.valid`.
- `tests/` (plural), `middlewares/` (plural): the two spellings that were split across your repos.
- Not verified: pointing `sequelize-cli` at `src/database/*` needs a `.sequelizerc`, and in an ESM project the migration and seeder files normally have to be `.cjs`. Try it on the first new Express app before copying the pattern.

## 3. Vite + React + TypeScript

```
ui/
├─ public/
├─ src/
│  ├─ main.tsx
│  ├─ app/
│  │  ├─ App.tsx
│  │  ├─ router.tsx               # routes -> pages
│  │  └─ providers.tsx            # QueryClient, theme, toaster
│  ├─ pages/                      # one file per route; composes features, no data logic
│  ├─ features/
│  │  └─ <feature>/
│  │     ├─ api.ts                # the only place that calls apiClient + unwrapItem/List/Page
│  │     ├─ hooks.ts              # React Query hooks
│  │     ├─ components/
│  │     ├─ types.ts
│  │     └─ index.ts              # public surface of the feature
│  ├─ components/
│  │  ├─ ui/                      # primitives (Button, Input, Dialog)
│  │  ├─ layout/
│  │  └─ QueryState.tsx           # loading / error / empty (implement in the project)
│  ├─ lib/
│  │  ├─ api-client.ts            # implement in the project
│  │  └─ error-messages.ts        # implement in the project
│  ├─ helpers/index.ts            # formatIdr, formatDateTime, slugify (implement in the project)
│  ├─ stores/                     # Zustand, only for client state
│  ├─ styles/tokens.css           # implement in the project, the only place with raw colors
│  └─ types/
├─ index.html                     # font <link> (see tokens.css)
├─ .env.example                   # VITE_API_URL
└─ package.json
```

## 4. Next.js (App Router) + TypeScript

```
ui/
├─ public/
├─ src/
│  ├─ app/                        # routing layer: layout.tsx, page.tsx, error.tsx, loading.tsx, not-found.tsx
│  │  ├─ (public)/...             # route groups
│  │  └─ globals.css              # @import '../styles/tokens.css'
│  ├─ features/<feature>/         # identical to Vite
│  ├─ components/{ui,layout}/     # identical to Vite
│  ├─ lib/                        # api-client.ts, error-messages.ts (identical to Vite)
│  ├─ helpers/                    # identical to Vite
│  ├─ styles/tokens.css
│  └─ types/
├─ .env.example                   # NEXT_PUBLIC_API_URL
└─ package.json
```

Rules (both front ends)
- Page and route files compose; **features own data**. Components never call axios directly.
- Only `lib/api-client.ts` touches the response envelope, through `unwrapItem` / `unwrapList` / `unwrapPage`.
- Components use semantic tokens only (`docs/DESIGN_SYSTEM.md`), never raw hex.
- The only difference between Vite and Next.js is the routing layer (`app/router.tsx` + `pages/` vs `src/app/`). `features/`, `components/`, `lib/`, `styles/` are the same.
- In Next.js, a component that takes callbacks (e.g. `QueryState` with `onRetry`) must be rendered from a Client Component.
- Environment: `VITE_API_URL` / `NEXT_PUBLIC_API_URL` = `http://localhost:3CNN/api` (configure in the frontend environment example).

---

## 5. Naming

| Thing | Convention | Example |
|---|---|---|
| Folders, API files | kebab-case | `order-items/`, `order-items.service.ts` |
| React components | PascalCase file | `OrderCard.tsx` |
| Hooks | `use` + camelCase | `useOrders` |
| Test files | next to the code (`*.spec.ts`, `*.test.tsx`); API e2e in `test/` (Nest) or `tests/` (Express) | |
| Routes | plural kebab-case under `/api` | `/api/order-items` |
| DB tables | snake_case plural | `order_items` |

## 6. Same job, same place

| Job | NestJS | Express |
|---|---|---|
| Entry | `src/main.ts` | `src/server.js` + `src/app.js` |
| Response contract | `common/contract/envelope.ts` + `interceptors/` + `filters/` | `common/contract/response.js` + `middlewares/error-handler.js` |
| Request id | `common/middlewares/` | `common/middlewares/request-id.js` |
| Validation (Zod) | `common/pipes/zod-validation.pipe.ts` | `common/middlewares/validate.js` |
| Pagination | `common/pagination/` | `common/pagination/` |
| Env validation | `common/config/env.ts` | `common/config/env.js` |
| Observability | `observability/` (`ObservabilityModule.register`) | `observability/` (`createObservabilityRouter`) |
| Feature | `modules/<feature>/` | `modules/<feature>/` |
| Unit / integration tests | `*.spec.ts` + `test/` | `tests/` |

## 7. `common/` vs `helpers/`
| | `common/` | `helpers/` |
|---|---|---|
| Holds | The API's contract plumbing: envelope, filters, interceptors, middleware, pipes, auth, config | Small pure functions: format, slug, mask |
| May import the framework | yes | no |
| May touch I/O or the request | yes | never |
| Business rules | no | no (they live in `modules/` or `features/`) |
| Index | one folder per concern | one `index` file, split into `helpers/<topic>.ts` when it grows |

Frontend: `lib/` is plumbing (api-client, error messages); `helpers/` is pure functions. A helper that needs `fetch` or React is not a helper.

## 8. Express uses functions, Nest uses classes
Both keep the controller / service split. Express modules export plain functions (`listProducts`, `createProduct`): classes in Express need `this` binding when passed to a route and add nothing. Nest uses classes because its DI is built on them.

## 9. Optional architecture choices
- Zod request bodies in Swagger (`nestjs-zod` or hand-written `@ApiProperty` DTO classes). Today the Zod pipe validates and response DTOs document.
- A shared package (`@vsg/api-contract`) instead of copying `common/`.
