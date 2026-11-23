import jwt from 'jsonwebtoken';
import { AppError } from '../contract/response.js';

const bearer = (req) => {
  const header = req.headers.authorization ?? '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : null;
};

function verifyAccess(token, secret) {
  const payload = jwt.verify(token, secret);
  if (payload.typ === 'refresh') throw new AppError(401, 'A refresh token cannot be used here', 'UNAUTHORIZED');
  return { id: payload.sub, role: payload.role };
}

/** Requires a valid access token; sets req.user = { id, role }. 401 otherwise. */
export const authenticate = (secret) => (req, _res, next) => {
  try {
    const token = bearer(req);
    if (!token) throw new AppError(401, 'Authentication required', 'UNAUTHORIZED');
    req.user = verifyAccess(token, secret);
    next();
  } catch (e) {
    next(e);
  }
};

/** Sets req.user when a valid token is sent; never fails. Used before the observability router. */
export const identify = (secret) => (req, _res, next) => {
  const token = bearer(req);
  if (token) {
    try {
      req.user = verifyAccess(token, secret);
    } catch {
      req.user = undefined;
    }
  }
  next();
};

/** 403 FORBIDDEN when the signed-in role is not in the list. Run after authenticate. */
export const requireRoles = (...roles) => (req, _res, next) =>
  next(roles.includes(req.user?.role) ? undefined : new AppError(403, 'Insufficient role', 'FORBIDDEN'));
