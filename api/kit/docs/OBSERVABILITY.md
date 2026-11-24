# Observability (standard module)

Implement `src/observability` in the project using the contracts below. Connect database probes and activity sources to real project data.

| Part | Route | Requirement | Notes |
|---|---|---|---|
| Health | `GET /api/health` | Required | Checks the database |
| Monitoring | `GET /api/monitoring` | Required | Node version, memory, DB latency |
| Activities | `GET /api/activities` | Required merge | You supply one **source** per entity |
| Version | `GET /api/version` | Required | name, type, version, commit |
| Public info | `GET /api/public` | Required | name, environment, docsUrl, serverTime |
| Stats | `GET /api/stats` | Scope dependent | Counts depend on your tables |
| Public resources | `GET /api/public/<resource>` (+ `/:id`) | Scope dependent | Read-only lists for the dashboard |

## Wiring: NestJS

```ts
// Implement this registration interface in app.module.ts
ObservabilityModule.register({
  imports: [PrismaModule],
  databaseProbe: {
    provide: DATABASE_PROBE,
    useFactory: (prisma: PrismaService) => ({ ping: async () => { await prisma.$queryRaw`SELECT 1`; } }),
    inject: [PrismaService],
  },
  appInfo: { name: 'Example App', type: 'EXAMPLE', version: '1.0.0' }, // or APP_NAME / APP_TYPE / APP_VERSION
  activitySources: [ProductActivitySource, OrderActivitySource],
  access: allowRoles(['ADMIN', 'STAFF'], (req) => req.user?.role), // required; ALLOW_ALL only in dev/tests
});
```

## Wiring: Express

```js
app.use('/api', createObservabilityRouter({
  name: 'Example App', type: 'EXAMPLE', version: '1.0.0',
  checkDatabase: async () => { await sequelize.authenticate(); },
  activitySources: [orderActivitySource],
  access: allowRoles(['ADMIN', 'STAFF'], (req) => req.user?.role), // required; allowAll only in dev/tests
}));
```

Set the name explicitly. If neither `appInfo` nor `APP_NAME` is set, the app reports itself as `app`.

## Response shapes

```jsonc
// GET /api/health  (HTTP 200 even when DOWN)
{ "status": "UP" | "DOWN", "application": "Example App", "database": "CONNECTED" | "DISCONNECTED",
  "version": "1.0.0", "timestamp": "ISO", "uptime": 123 }

// GET /api/monitoring
{ "application": "...", "node": { "version", "uptime", "platform", "environment" },
  "memory": { "rss", "heapTotal", "heapUsed", "external" },
  "database": { "status", "latency" }, "response": { "generatedAt" } }

// GET /api/activities  (max 30 entries, newest first, 5 per source)
[ { "id": "order-12", "type": "ORDER_CREATED", "entity": "Order", "title": "#12",
    "description": "Order PENDING", "createdAt": "ISO", "application": "Example App" } ]
```

All of these are wrapped in the standard envelope (`docs/CONVENTIONS.md`).

## Activity sources (replaces seven copy-pasted queries)

One class per entity. It returns the newest `limit` entries; the module merges, sorts, tags the application name and cuts to 30.

```ts
@Injectable()
class OrderActivitySource implements ActivitySource {
  constructor(private readonly prisma: PrismaService) {}
  async collect(limit: number) {
    const rows = await this.prisma.order.findMany({ where: byOrderItems, take: limit, orderBy: { createdAt: 'desc' } });
    return rows.map((o) => ({ id: `order-${o.id}`, type: 'ORDER_CREATED', entity: 'Order',
      title: `#${o.id}`, description: `Order ${o.status}`, createdAt: o.createdAt }));
  }
}
```

## Stats (per app)

Keep this base so a dashboard can read every app the same way, and put your counts in groups:

```jsonc
{ "application": { "name": "Example App", "type": "EXAMPLE" },
  "orders": { "total": 200, "pending": 10, "completed": 180, "cancelled": 10 },
  "latest": { "order": "ISO | null" } }
```

## Public resources (per app)

`GET /api/public/<resource>` (plural kebab-case) and `GET /api/public/<resource>/:id`.
- Read-only, no authentication, for the dashboard.
- Scoped to this application's rows when the database is shared (`common/scope`).
- Lists use the standard query (`?page=&limit=&sort=&q=`) and return `meta.pagination`.
- An unknown id is `404 NOT_FOUND`.

## Moving an existing API to this module

1. Replace any hard-coded application name in services, DTO examples and Swagger examples with `appInfo`.
2. Services currently return `{ data }`. With the standard interceptor that becomes `data.data`. **Return the raw value.**
3. If `findOne` returns `{ data: null }` for an unknown id, change it to `404 NOT_FOUND` and check that the front end does not rely on `data: null`.
4. The public lists return every row. Add pagination before the tables grow.
5. Swap `SwaggerSuccess({...})` examples for `ApiOkEnvelope(Dto)` / `ApiListEnvelope(Dto)`.

## Security (decided)

| Route | Access |
|---|---|
| `/api/health`, `/api/version`, `/api/public` | Open |
| `/api/monitoring`, `/api/activities` | Token with role `ADMIN` or `STAFF`. 401 `UNAUTHORIZED` without a token, 403 `FORBIDDEN` for `USER`. |
| `/api/public/<resource>` | Open, but **no personal data** (below) |

- The implementation must enforce this: `access` is a **required** option of `ObservabilityModule.register` / `createObservabilityRouter`. Pass `allowRoles(['ADMIN','STAFF'], (req) => req.user?.role)`; your own auth guard or middleware must run first and set `req.user`. `ALLOW_ALL` / `allowAll` exist for development and tests only.
- Why: in the reference implementation, public order and payment routes exposed customer names and emails, while `/monitoring` and `/activities` were open.
- Public resources (`public/<resource>`) are written per app and must be implemented only when requested. When you write them: return an allow-list DTO (never the raw row), drop email and phone, and mask names with `maskName` (`Budi Santoso` -> `Budi S.`; in `helpers/`). Add a test that the response contains no `email` key.
