# API contract

Base URL `http://localhost:3102/api` · Swagger UI `/api/docs` · envelope `{ success, message, data, meta, error: { code, details }, requestId }`.

Access below is for `AUTH_REQUIRED=true`. With the default `false`, the generator and projects routes are open; observability keeps its rule.

| Method | Path | Access | Returns |
|---|---|---|---|
| GET | `/health`, `/version`, `/public` | Open | observability (kit) |
| GET | `/monitoring`, `/activities` | ADMIN, STAFF | observability (kit) |
| POST | `/auth/login` | Open | `{ accessToken, refreshToken, expiresIn, user }` |
| POST | `/auth/refresh` | Open | `{ accessToken, expiresIn }` |
| GET | `/auth/me` | signed in | `{ id, email, name, role }` |
| GET | `/options` | open (signed in with `AUTH_REQUIRED=true`) | choices, tools, presets, Fixed Rules, outputs, purposes, types, domains |
| POST | `/compatibility-checks` | signed in | `{ ok, level, errors, problems, docs, configHash }` (always 200) |
| POST | `/generations` | ADMIN, STAFF | 201 `{ id, level, problems, configHash, generatedOn, files[], markdown, manifest }`; 422 `UNPROCESSABLE` with the reasons in `error.details` |
| GET | `/generations` | signed in | history, `meta.pagination` |
| GET | `/projects` | signed in | list, `?page&limit&sort&q`, `meta.pagination` |
| GET | `/projects/:id` | signed in | one project; 404 `NOT_FOUND` |
| POST | `/projects` | ADMIN, STAFF | 201, `{ name, config }` |
| PATCH | `/projects/:id` | ADMIN, STAFF | updated project |
| DELETE | `/projects/:id` | ADMIN, STAFF | `data: null` |
