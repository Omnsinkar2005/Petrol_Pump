const jwt = require('jsonwebtoken');

/**
 * Verifies JWT from the `Authorization: Bearer <token>` header.
 * On success, attaches { id, username, role, employee_id } to req.user.
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({
      success: false,
      message: 'Missing or malformed Authorization header. Expected: Bearer <token>',
    });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: payload.id,
      username: payload.username,
      role: payload.role,
      employee_id: payload.employee_id ?? null,
    };
    return next();
  } catch (err) {
    const msg =
      err.name === 'TokenExpiredError'
        ? 'Token expired, please log in again'
        : 'Invalid token';
    return res.status(401).json({ success: false, message: msg });
  }
}

/**
 * Role gate factory.
 * Usage: router.get('/admin-only', requireAuth, requireRole('admin'), handler)
 *        router.get('/staff', requireAuth, requireRole('admin', 'owner', 'manager'), handler)
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}`,
      });
    }
    return next();
  };
}

/**
 * Helper: employees can only access their OWN employee_id.
 * Other roles pass through. Use after requireAuth.
 *
 * Usage:
 *   router.get('/salary/:employeeId',
 *     requireAuth,
 *     allowSelfOrRoles('admin', 'owner', 'manager'),
 *     handler);
 */
function allowSelfOrRoles(...rolesWithFullAccess) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    if (rolesWithFullAccess.includes(req.user.role)) return next();

    const requestedId = Number(req.params.employeeId || req.params.id);
    if (req.user.employee_id && req.user.employee_id === requestedId) {
      return next();
    }
    return res.status(403).json({
      success: false,
      message: 'Access denied: employees can only access their own records',
    });
  };
}

module.exports = { requireAuth, requireRole, allowSelfOrRoles };
