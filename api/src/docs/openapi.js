/** OpenAPI document served at /api/docs. Every endpoint answers in the standard envelope (docs/CONVENTIONS.md). */
const envelope = (data, extra = {}) => ({
  type: 'object',
  properties: {
    success: { type: 'boolean' }, message: { type: 'string' }, data,
    meta: { type: 'object', nullable: true, ...extra.meta }, error: { $ref: '#/components/schemas/Error' }, requestId: { type: 'string' },
  },
});
const ok = (description, data = { type: 'object' }, extra) => ({ description, content: { 'application/json': { schema: envelope(data, extra) } } });
const err = (codes) => Object.fromEntries(codes.map((c) => [c, { description: { 400: 'VALIDATION_ERROR', 401: 'UNAUTHORIZED', 403: 'FORBIDDEN', 404: 'NOT_FOUND', 413: 'PAYLOAD_TOO_LARGE', 422: 'UNPROCESSABLE' }[c], content: { 'application/json': { schema: envelope({ nullable: true }) } } }]));
const secured = [{ bearer: [] }];
const listParams = ['page', 'limit', 'sort', 'q'].map((name) => ({ name, in: 'query', schema: { type: name === 'page' || name === 'limit' ? 'integer' : 'string' } }));
const idParam = [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }];
const configBody = { required: true, content: { 'application/json': { schema: { type: 'object', required: ['config'], properties: { config: { $ref: '#/components/schemas/Config' }, projectId: { type: 'string', format: 'uuid' } } } } } };
const paginated = { meta: { properties: { pagination: { $ref: '#/components/schemas/Pagination' } } } };

export function buildOpenApi({ name, version }) {
  return {
    openapi: '3.0.3',
    info: { title: `${name} API`, version, description: 'Response envelope: `{ success, message, data, meta, error: { code, details }, requestId }`.' },
    servers: [{ url: '/api' }],
    components: {
      securitySchemes: { bearer: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
      schemas: {
        Error: { type: 'object', nullable: true, properties: { code: { type: 'string' }, details: { type: 'array', items: {} } } },
        Pagination: { type: 'object', properties: { page: { type: 'integer' }, limit: { type: 'integer' }, total: { type: 'integer' }, totalPages: { type: 'integer' } } },
        User: { type: 'object', properties: { id: { type: 'string', format: 'uuid' }, email: { type: 'string' }, name: { type: 'string' }, role: { type: 'string', enum: ['ADMIN', 'STAFF', 'USER'] } } },
        Config: { type: 'object', description: 'Lighthouse configuration (see kit/library/outputs/README.md): schemaVersion, preset, project, stack, customRules, outputs.' },
        Project: { type: 'object', properties: { id: { type: 'string', format: 'uuid' }, name: { type: 'string' }, slug: { type: 'string' }, config: { $ref: '#/components/schemas/Config' }, createdBy: { type: 'string' }, createdAt: { type: 'string', format: 'date-time' }, updatedAt: { type: 'string', format: 'date-time' } } },
        Generation: { type: 'object', properties: { id: { type: 'string' }, level: { type: 'string', enum: ['supported', 'allowed', 'warn'] }, problems: { type: 'array', items: { type: 'object' } }, configHash: { type: 'string' }, files: { type: 'array', items: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' }, bytes: { type: 'integer' } } } }, markdown: { type: 'string' } } },
      },
    },
    paths: {
      '/health': { get: { tags: ['Observability'], summary: 'Health', responses: { 200: ok('status, application, database, version, timestamp, uptime') } } },
      '/version': { get: { tags: ['Observability'], summary: 'Version', responses: { 200: ok('name, type, version, commit') } } },
      '/public': { get: { tags: ['Observability'], summary: 'Public app metadata', responses: { 200: ok('name, environment, docsUrl, serverTime') } } },
      '/monitoring': { get: { tags: ['Observability'], summary: 'Monitoring (ADMIN, STAFF)', security: secured, responses: { 200: ok('node, memory, database'), ...err([401, 403]) } } },
      '/activities': { get: { tags: ['Observability'], summary: 'Latest activities (ADMIN, STAFF)', security: secured, responses: { 200: ok('activities', { type: 'array', items: { type: 'object' } }), ...err([401, 403]) } } },
      '/auth/login': { post: { tags: ['Auth'], summary: 'Sign in', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['email', 'password'], properties: { email: { type: 'string' }, password: { type: 'string' } } } } } }, responses: { 200: ok('accessToken, refreshToken, expiresIn, user'), ...err([400, 401]) } } },
      '/auth/refresh': { post: { tags: ['Auth'], summary: 'New access token', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['refreshToken'], properties: { refreshToken: { type: 'string' } } } } } }, responses: { 200: ok('accessToken, expiresIn'), ...err([400, 401]) } } },
      '/auth/me': { get: { tags: ['Auth'], summary: 'Current user', security: secured, responses: { 200: ok('user', { $ref: '#/components/schemas/User' }), ...err([401]) } } },
      '/options': { get: { tags: ['Generator'], summary: 'Choices, tools, presets, Fixed Rules and outputs from the project requirements library', security: secured, responses: { 200: ok('options'), ...err([401]) } } },
      '/compatibility-checks': { post: { tags: ['Generator'], summary: 'Validate a configuration without generating', security: secured, requestBody: configBody, responses: { 200: ok('ok, level, errors, problems, docs, configHash'), ...err([400, 401]) } } },
      '/generations': {
        get: { tags: ['Generator'], summary: 'Generation history', security: secured, parameters: listParams, responses: { 200: ok('generations', { type: 'array', items: { type: 'object' } }, paginated), ...err([400, 401]) } },
        post: { tags: ['Generator'], summary: 'Generate the project package (ADMIN, STAFF)', security: secured, requestBody: configBody, responses: { 201: ok('generation', { $ref: '#/components/schemas/Generation' }), ...err([400, 401, 403, 422]) } },
      },
      '/generations/{id}/export-zip': {
        post: { tags: ['Generator'], summary: 'Save a ZIP after Export ZIP is clicked (ADMIN, STAFF)', security: secured, parameters: idParam,
          requestBody: { required: true, content: { 'application/zip': { schema: { type: 'string', format: 'binary' } } } },
          responses: { 200: ok('Saved ZIP filename', { type: 'object', properties: { filename: { type: 'string' } } }), ...err([400, 401, 403, 404, 413]) } },
      },
      '/projects': {
        get: { tags: ['Projects'], summary: 'Saved projects', security: secured, parameters: listParams, responses: { 200: ok('projects', { type: 'array', items: { $ref: '#/components/schemas/Project' } }, paginated), ...err([400, 401]) } },
        post: { tags: ['Projects'], summary: 'Save a project (ADMIN, STAFF)', security: secured, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name', 'config'], properties: { name: { type: 'string' }, config: { $ref: '#/components/schemas/Config' } } } } } }, responses: { 201: ok('project', { $ref: '#/components/schemas/Project' }), ...err([400, 401, 403]) } },
      },
      '/projects/{id}': {
        get: { tags: ['Projects'], summary: 'One project', security: secured, parameters: idParam, responses: { 200: ok('project', { $ref: '#/components/schemas/Project' }), ...err([401, 404]) } },
        patch: { tags: ['Projects'], summary: 'Update name or config (ADMIN, STAFF)', security: secured, parameters: idParam, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' }, config: { $ref: '#/components/schemas/Config' } } } } } }, responses: { 200: ok('project', { $ref: '#/components/schemas/Project' }), ...err([400, 401, 403, 404]) } },
        delete: { tags: ['Projects'], summary: 'Delete (ADMIN, STAFF)', security: secured, parameters: idParam, responses: { 200: ok('null', { nullable: true }), ...err([401, 403, 404]) } },
      },
    },
  };
}
