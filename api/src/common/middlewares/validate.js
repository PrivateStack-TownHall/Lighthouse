/** validate(schema, 'body' | 'query' | 'params') - Zod everywhere. Errors flow to errorHandler. */
export const validate = (schema, source = 'body') => (req, _res, next) => {
  try {
    const parsed = schema.parse(req[source]);
    // Express 5 makes req.query read-only, so keep parsed values on req.valid.
    req.valid = { ...(req.valid ?? {}), [source]: parsed };
    next();
  } catch (e) {
    next(e);
  }
};

export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
