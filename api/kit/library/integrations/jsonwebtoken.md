---
id: jsonwebtoken
name: JWT (jsonwebtoken)
category: integration
status: partial
verified_on: 2026-11-23
versions:
  npm_latest: "9.0.3"
  recommended: "9.x"
  kit_tested: "none (types only, `auth.types.ts`)"
node: ">=12"
requires: []
conflicts_with: []
---
# JWT (jsonwebtoken)

## 1. What it is, in one line
Signs and verifies access and refresh tokens for the single auth contract.

## 2. Choose it when / do not choose it when
Default for every API with login.

## 3. Versions and requirements
| Item | Value | Source |
|---|---|---|
| jsonwebtoken | 9.0.3 | `npm view` 2026-11-23 |

## 4. Scaffold (official CLI first)
No scaffold.

## 5. Install
`npm i jsonwebtoken` (+ `@types/jsonwebtoken` for TypeScript)

## 6. Folder structure
`common/auth/` (types, guards or middleware, `@Roles`, `@CurrentUser`).

## 7. package.json scripts
None.

## 8. Config files
`JWT_SECRET` (at least 32 characters, validated at boot).

## 9. Rules (MUST / MUST NOT)
- MUST use the payload `{ sub, role, iat, exp }`.
- Access token 15 minutes, refresh token 7 days.
- MUST return 401 `UNAUTHORIZED` for a missing, invalid or expired token and 403 `FORBIDDEN` for a wrong role.
- MUST NOT put email or name in the token.
- MUST hash passwords with `bcryptjs`.

## 10. Known pitfalls
- Implement auth types, middleware or guards, login and refresh services in the project according to the documented auth contract.

## 11. Prompt fragment
> Auth: `POST /api/auth/login` -> `{ accessToken, refreshToken, expiresIn, user }`; `GET /api/auth/me`. Token payload `{ sub, role, iat, exp }`, access 15m, refresh 7d. 401 UNAUTHORIZED vs 403 FORBIDDEN.

## 12. Verification
| Claim | Mark | Evidence |
|---|---|---|
| Contract text | [T] | `nest/src/common/auth/auth.types.ts`; the access rule for observability is tested |
| Login / refresh implementation | [?] | not yet verified in a running project |
| Version | [V] | `npm view` 2026-11-23 |

## 13. Sources
- `npm view jsonwebtoken`
- `docs/CONVENTIONS.md` section 5
