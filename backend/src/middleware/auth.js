const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'ebr-dev-secret-change-in-production';

async function authenticate(request, reply) {
  const token = request.cookies?.token;
  if (!token) {
    const err = new Error('Authentication required');
    err.statusCode = 401;
    throw err;
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (!payload.tenant_id) {
      const err = new Error('Tenant context missing in token');
      err.statusCode = 401;
      throw err;
    }
    request.user = payload;
    request.tenant = {
      id: payload.tenant_id,
      slug: payload.tenant_slug,
      name: payload.tenant_name,
    };
  } catch {
    const err = new Error('Invalid or expired token');
    err.statusCode = 401;
    throw err;
  }
}

function requireRole(...roles) {
  return async function (request) {
    if (!request.user || !roles.includes(request.user.role)) {
      const err = new Error('Insufficient permissions');
      err.statusCode = 403;
      throw err;
    }
  };
}

module.exports = { authenticate, requireRole, JWT_SECRET };
