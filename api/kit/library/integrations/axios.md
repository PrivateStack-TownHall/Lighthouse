---
id: axios
name: Axios
category: integration
status: partial
verified_on: 2026-11-23
versions:
  npm_latest: "1.21.1"
  recommended: "1.x"
  kit_tested: "`api-client.ts` typechecks"
node: "n/a"
requires: []
conflicts_with: []
---
# Axios

## 1. What it is, in one line
HTTP client used by `frontend/src/lib/api-client.ts`.

## 2. Choose it when / do not choose it when
Default for every front end of the kit.

## 3. Versions and requirements
| Item | Value | Source |
|---|---|---|
| axios | 1.21.1 | `npm view` 2026-11-23 |

## 4. Scaffold (official CLI first)
No scaffold.

## 5. Install
`npm i axios`

## 6. Folder structure
Only `lib/api-client.ts` imports axios.

## 7. package.json scripts
None.

## 8. Config files
Base URL from `VITE_API_URL` / `NEXT_PUBLIC_API_URL`. Token from your auth store; sends `Authorization: Bearer <accessToken>`.

## 9. Rules (MUST / MUST NOT)
- MUST import axios only in `lib/api-client.ts`.
- MUST unwrap the envelope through `unwrapItem` / `unwrapList` / `unwrapPage`.
- MUST turn a failure into `ApiError` (code, message, requestId, details).
- MUST map `error.code` to a toast message with `lib/error-messages.ts`.

## 10. Known pitfalls
- Implement refresh-token retry logic in the shared API client once, not per feature; limit retries to prevent loops.

## 11. Prompt fragment
> All HTTP goes through `src/lib/api-client.ts` (axios). Never import axios in components or features. Use `unwrapItem`, `unwrapList` or `unwrapPage` and show errors through `error-messages.ts`.

## 12. Verification
| Claim | Mark | Evidence |
|---|---|---|
| api-client typechecks | [T] | tsc strict |
| Runs against a real API | [?] | not run |
| Version | [V] | `npm view` 2026-11-23 |

## 13. Sources
- `npm view axios`
