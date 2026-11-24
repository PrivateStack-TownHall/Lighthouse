---
id: typescript
name: TypeScript
category: language
status: partial
verified_on: 2026-11-23
versions:
  npm_latest: "7.0.2"
  recommended: "7.x"
  kit_tested: "6.0.3 and 7.0.2, strict"
node: ">=16.20.0"
requires: []
conflicts_with: []
---
# TypeScript

## 1. What it is, in one line
Typed JavaScript. Required by the NestJS and Next.js choices; the kit front end and Nest code are TypeScript.

## 2. Choose it when / do not choose it when
Choose for NestJS, Next.js, Vite React and any API with several contributors. Do not choose it for a throwaway script.

## 3. Versions and requirements
| Item | Value | Source |
|---|---|---|
| npm latest | 7.0.2 | `npm view` 2026-11-23 |
| Kit typecheck | 6.0.3 and 7.0.2, `strict: true`, `noEmit` | [T] run 2026-11-23 |
| Node | >=16.20.0 | `npm view` 2026-11-23 |

## 4. Scaffold (official CLI first)
`npx tsc --init` (the official way to create `tsconfig.json`). Framework scaffolds (`nest new`, `create vite`, `create-next-app`) create their own `tsconfig` files: keep those.

## 5. Install
`npm i -D typescript @types/node`

## 6. Folder structure
Add `src/types/` for shared types and `helpers/index.ts`. Test files sit next to the code (`docs/ARCHITECTURE.md`).

## 7. package.json scripts
`typecheck` = `tsc --noEmit` (`tsc -b` for the Vite project references). In `nest-prisma` it is `prisma generate && tsc --noEmit`.

## 8. Config files
`tsconfig.json`. NestJS needs `experimentalDecorators` and `emitDecoratorMetadata`. Choose and document compiler strictness, and typecheck the actual project.

## 9. Rules (MUST / MUST NOT)
- MUST run `typecheck` before merging.
- MUST NOT use `any` for API payloads; infer types from Zod schemas (`z.infer`).
- MUST put shared types in `types/`.
- MUST write `@ApiProperty({ type: ... })` with an explicit `type` in Nest DTOs (builds that do not emit decorator metadata, such as esbuild, tsx and vitest, otherwise fail).

## 10. Known pitfalls
- Under TypeScript 6, a `tsconfig` used by ts-node needed `ignoreDeprecations: "6.0"` and `rootDir` [T].
- TypeScript 7.0.2 is a new major line: the reference checks passed, but your project plugins and tools (ts-node, jest transforms) were not tried against it [?].

## 11. Prompt fragment
> Use TypeScript. Put shared types in `src/types/`. Infer types from Zod schemas. Run `npm run typecheck` before finishing. In NestJS DTOs always write `@ApiProperty({ type })` with an explicit `type`.

## 12. Verification
| Claim | Mark | Evidence |
|---|---|---|
| Kit passes strict typecheck | [T] | `tsc` 6.0.3 and 7.0.2, no errors |
| Latest version | [V] | `npm view` 2026-11-23 |
| ts-node / jest with TS 7 | [?] | not tried |

## 13. Sources
- `npm view typescript`
