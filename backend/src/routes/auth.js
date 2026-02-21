const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { authenticate, JWT_SECRET } = require('../middleware/auth');
const { logEvent, getIp } = require('../utils/audit');

const DEFAULT_TENANT = (process.env.DEFAULT_TENANT_SLUG || 'demo').toLowerCase();
const TOKEN_TTL = process.env.JWT_EXPIRES_IN || '24h';

async function routes(fastify) {
  // POST /login
  fastify.post('/login', async (request, reply) => {
    const { email, password, tenant } = request.body || {};
    if (!email || !password) {
      return reply.status(400).send({ success: false, error: 'Email and password required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const tenantSlug = (tenant || DEFAULT_TENANT).toLowerCase().trim();

    const { rows } = await pool.query(
      `SELECT u.*, t.slug AS tenant_slug, t.name AS tenant_name
       FROM users u
       INNER JOIN tenants t ON t.id = u.tenant_id AND t.is_active = true
       WHERE u.email = $1 AND u.is_active = true AND t.slug = $2`,
      [normalizedEmail, tenantSlug]
    );

    if (!rows.length) {
      const tenantRow = await pool.query('SELECT id FROM tenants WHERE slug = $1', [tenantSlug]);
      if (tenantRow.rows.length) {
        await logEvent({
          tenant_id: tenantRow.rows[0].id,
          action: 'auth.login.failed',
          entity_type: 'session',
          ip_address: getIp(request),
          details: { email: normalizedEmail },
        });
      }
      return reply.status(401).send({ success: false, error: 'Invalid credentials' });
    }

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      await logEvent({
        tenant_id: user.tenant_id,
        action: 'auth.login.failed',
        entity_type: 'session',
        entity_id: user.id,
        ip_address: getIp(request),
        details: { email: user.email },
      });
      return reply.status(401).send({ success: false, error: 'Invalid credentials' });
    }

    const payload = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      tenant_id: user.tenant_id,
      tenant_slug: user.tenant_slug,
      tenant_name: user.tenant_name,
    };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_TTL });

    reply.setCookie('token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 86400,
    });

    await logEvent({
      tenant_id: user.tenant_id,
      action: 'auth.login',
      entity_type: 'session',
      entity_id: user.id,
      performed_by: user.full_name,
      ip_address: getIp(request),
      details: { email: user.email, role: user.role },
    });

    return {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      tenant: { id: user.tenant_id, slug: user.tenant_slug, name: user.tenant_name },
    };
  });

  // POST /logout
  fastify.post('/logout', { preHandler: [authenticate] }, async (request, reply) => {
    await logEvent({
      tenant_id: request.tenant.id,
      action: 'auth.logout',
      entity_type: 'session',
      entity_id: request.user.id,
      performed_by: request.user.full_name,
      ip_address: getIp(request),
      details: { email: request.user.email },
    });
    reply.clearCookie('token', { path: '/' });
    return { success: true };
  });

  // GET /me
  fastify.get('/me', { preHandler: [authenticate] }, async (request, reply) => {
    const { rows } = await pool.query(
      `SELECT id, email, full_name, role, is_active
       FROM users
       WHERE id = $1 AND tenant_id = $2 AND is_active = true`,
      [request.user.id, request.tenant.id]
    );
    if (!rows.length) {
      reply.clearCookie('token', { path: '/' });
      return reply.status(401).send({ success: false, error: 'User not found or deactivated' });
    }
    return {
      ...rows[0],
      tenant: { ...request.tenant },
    };
  });
}

module.exports = routes;
