---
id: bcryptjs
name: bcryptjs
category: integration
status: partial
verified_on: 2026-11-23
versions:
  npm_latest: "3.0.3"
  recommended: "3.x"
  kit_tested: "none"
node: "n/a"
requires: []
conflicts_with: []
---
# bcryptjs

## 1. What it is, in one line
Pure-JavaScript password hashing (decided: bcryptjs everywhere).

## 2. Choose it when / do not choose it when
Default for password storage.

## 3. Versions and requirements
| Item | Value | Source |
|---|---|---|
| bcryptjs | 3.0.3 | `npm view` 2026-11-23 |

## 4. Scaffold (official CLI first)
No scaffold.

## 5. Install
`npm i bcryptjs`

## 6. Folder structure
Used only in the auth service.

## 7. package.json scripts
None.

## 8. Config files
Cost factor in env, not in code.

## 9. Rules (MUST / MUST NOT)
- MUST hash with bcryptjs; MUST NOT store or log plain passwords.
- MUST NOT mix `bcrypt` (native) and `bcryptjs` across apps.

## 10. Known pitfalls
- Slower than native `bcrypt`; this was accepted for portability [?].

## 11. Prompt fragment
> Hash passwords with `bcryptjs`. Never log or return a password or hash.

## 12. Verification
| Claim | Mark | Evidence |
|---|---|---|
| Version | [V] | `npm view` 2026-11-23 |
| Usage in the kit | [?] | none |

## 13. Sources
- `npm view bcryptjs`
