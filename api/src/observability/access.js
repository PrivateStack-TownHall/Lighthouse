import { AppError } from '../common/contract/response.js';

/** Open access. For local development and tests only: never use it in a commercial app. */
export const allowAll = () => 'ALLOW';

/**
 * Standard rule: authenticated ADMIN or STAFF.
 * `resolveRole` reads the role your auth middleware already put on the request (e.g. req.user?.role)
 * and returns null/undefined when the request is not authenticated.
 *
 * Decisions: 'ALLOW' | 'UNAUTHENTICATED' (-> 401 UNAUTHORIZED) | 'FORBIDDEN' (-> 403 FORBIDDEN)
 */
export function allowRoles(roles, resolveRole) {
  return (req) => {
    const role = resolveRole(req);
    if (!role) return 'UNAUTHENTICATED';
    return roles.includes(role) ? 'ALLOW' : 'FORBIDDEN';
  };
}

/** Express middleware that applies an access function. */
export function requireAccess(access) {
  return async (req, _res, next) => {
    try {
      const decision = await access(req);
      if (decision === 'UNAUTHENTICATED') throw new AppError(401, 'Authentication required', 'UNAUTHORIZED');
      if (decision === 'FORBIDDEN') throw new AppError(403, 'Insufficient role', 'FORBIDDEN');
      next();
    } catch (e) {
      next(e);
    }
  };
}
