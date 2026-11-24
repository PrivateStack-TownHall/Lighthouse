---
id: nestjs
name: NestJS
category: backend
status: partial
verified_on: 2026-11-23
versions:
  npm_latest: "@nestjs/core 12.6.0, @nestjs/cli 12.0.15, @nestjs/swagger 12.1.2"
  recommended: "12.x"
  kit_tested: "12.6.0 / swagger 12.1.2: smoke test (tsx and ts-node) and strict typecheck"
node: "run: >=20.19 or >=22.12; CLI generators: >=22.22.3, >=24.15 or >=26"
requires: ["typescript"]
conflicts_with: []
---
# NestJS

## 1. What it is, in one line
Structured TypeScript framework with modules, DI, guards and Swagger. Folder layout: `docs/ARCHITECTURE.md`.

## 2. Choose it when / do not choose it when
Choose for larger APIs, shared databases, role-based access, many modules. Choose Express for small APIs.

## 3. Versions and requirements
| Item | Value | Source |
|---|---|---|
| @nestjs/core | 12.6.0 | `npm view` 2026-11-23 |
| @nestjs/cli | 12.0.15 | `npm view` 2026-11-23 |
| Run an app | Node 20.19+ or 22.12+ | [V] docs.nestjs.com/first-steps |
| `nest new` / `nest generate` | Node 22.22.3+, 24.15+ or 26+ | [V] docs.nestjs.com/first-steps |

## 4. Scaffold (official CLI first)
```bash
npm i -g @nestjs/cli
nest new <name>
# non-interactive, into the current folder:
npx @nestjs/cli new . --skip-git --package-manager npm
```
Option `--type esm|cjs`: ESM uses Vitest, CommonJS uses Jest [V]. Choose the module format and test runner together (a proposal, not verified on a real scaffold).

## 5. Install
`npm i @nestjs/swagger zod`. ORM: follow the selected ORM section in `docs/STACK.md`.

## 6. Folder structure
`docs/ARCHITECTURE.md`: `src/common/*`, `src/observability/`, `src/modules/<feature>/`, `test/`.

## 7. package.json scripts
The scaffold ships `start`, `start:dev`, `lint` (oxlint) and `format` (Prettier) [V]; configure `lint` with ESLint and add a `dev` alias to the scaffold watch command; preserve working build/start/test commands.

## 8. Config files
`.env` validated at boot by `common/config/env.ts` (Zod). Register request-id middleware, the global response interceptor, exception filter, `/api` prefix and Swagger during bootstrap.

## 9. Rules (MUST / MUST NOT)
- MUST scaffold with `nest new`.
- MUST register `ResponseInterceptor`, `HttpExceptionFilter` and `requestIdMiddleware` globally.
- MUST validate input with `ZodValidationPipe` (Zod everywhere).
- MUST have services return raw values; NOT `{ data }`; list endpoints return `new Paginated(items, meta)`; not found throws `NotFoundException`.
- MUST write `@ApiProperty({ type })` with an explicit type.
- MUST pass `access` to `ObservabilityModule.register`.

## 10. Known pitfalls
- The current scaffold runs oxlint by default; the decision here is ESLint.
- Swagger `createDocument` fails under esbuild/tsx when `@ApiProperty` has no explicit `type` [T].

## 11. Prompt fragment
> Scaffold with `nest new`. Follow `docs/ARCHITECTURE.md`. Controllers parse input and call services; services return raw values. Validate with ZodValidationPipe. Register the global interceptor, filter and requestId middleware. Document every endpoint with the envelope decorators. Node >= 22.12 (and >= 22.22.3 for the Nest CLI generators).

## 12. Verification
| Claim | Mark | Evidence |
|---|---|---|
| Scaffold, flags, default scripts, Node | [V] | docs.nestjs.com/first-steps |
| Interceptor, filter, requestId, Zod pipe, Swagger envelope, observability | [T] | `nest/test/contract.smoke.ts` on Nest 12.6.0 |
| Jest e2e suite | [?] | the smoke test is not a Jest suite |
| `--type cjs` gives the proposed project layout | [?] | not scaffolded here |

## 13. Sources
- https://docs.nestjs.com/first-steps
- `npm view @nestjs/core @nestjs/cli @nestjs/swagger`
