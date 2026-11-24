---
id: nestjs-prisma-postgresql
name: NestJS + Prisma + PostgreSQL
category: combo
status: partial
verified_on: 2026-11-23
members: [nestjs, prisma, postgresql, typescript]
---

# NestJS + Prisma + PostgreSQL

## Wiring
- `PrismaService` extends or wraps a `PrismaClient` built with the `@prisma/adapter-pg` adapter (Prisma 7) [recorded in the Prisma guidance].
- Observability probe: `useFactory: (prisma) => ({ ping: async () => { await prisma.$queryRaw\`SELECT 1\`; } })` [probe shape T; the Prisma call was not run].
- Configure generate, migrate and seed scripts in the backend package and verify them against the installed Prisma major.

## Open points (verify on the first app)
| Point | Mark |
|---|---|
| Lifecycle scripts (`prisma generate` in `dev`/`build`/`typecheck`/`postinstall`) still right on Prisma 7 | [?] |
| Seed: `ts-node --transpile-only prisma/seed.ts` vs how v7 configures seeding | [?] |
| Prisma 7 is ESM-first; a `--type cjs` Nest scaffold may need changes | [?] |
| Generated client output (`generated/prisma`) and `.gitignore` | [?] |

## Prompt fragment
> NestJS with Prisma 7 (`prisma@7`, `@prisma/client@7`, `@prisma/adapter-pg`, `pg`). Build `PrismaClient` with the adapter. Schema changes only through `npx prisma migrate dev`. Do not use Prisma 8 (release candidate).
