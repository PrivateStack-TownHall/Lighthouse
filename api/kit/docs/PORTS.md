# Port scheme

Format: `[3 | 5 | 2] + category + NN`

| Prefix | Meaning |
|---|---|
| `3` | Backend (API) |
| `5` | Front end (UI) |
| `2` | Database (host port; the container still listens on 5432) |

| Category | Scope | API | UI | DB |
|---|---|---|---|---|
| 1 | A1 Main Apps | `31NN` | `51NN` | `21NN` |
| 2 | A2 APIs (no UI) | `32NN` | none | `22NN` |
| 3 | A3 Applications | `33NN` | `53NN` | `23NN` |

Examples: Orange LMS = API `3101`, UI `5101`, DB `2101`. Byte Burger = API `3201`, DB `2201`. Chibi = API `3301`, UI `5301`, DB `2301`.

## Rules
- `NN` 01-49 = main projects. `NN` 50-99 = auxiliary services (BFF, worker, aichat). This also keeps clear of Vite's default 5173/5174.
- A shared database (e.g. Commerce Core) uses the NN of the first API in the group.
- Only categories 1, 2 and 3 are in scope. Apps in any other folder (e.g. Full Time) are not touched.
- Helper: `node scripts/ports.mjs 1 01`
- Keep a port registry in your app registry spreadsheet (one row per app).

## Registry (fill in)
| App | Category | NN | API | UI | DB |
|---|---|---|---|---|---|
| Orange LMS | 1 | 01 | 3101 | 5101 | 2101 |
