const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');
const { logEvent, getIp } = require('../utils/audit');

const VALID_ROLES = ['admin', 'batch_manager', 'operator_supervisor', 'operator', 'qa_qc'];
const adminOnly = [authenticate, requireRole('admin')];

async function routes(fastify) {
  // GET / - list all users
  fastify.get('/', { preHandler: adminOnly }, async () => {
    const { rows } = await pool.query(
      'SELECT id, email, full_name, role, is_active, created_at FROM users ORDER BY created_at ASC'
    );
    return rows;
  });

  // POST / - create user
  fastify.post('/', { preHandler: adminOnly }, async (request, reply) => {
    const { email, password, full_name, role } = request.body || {};
    if (!email || !password || !full_name || !role) {
      return reply.status(400).send({ success: false, error: 'email, password, full_name, and role are required' });
    }
    if (!VALID_ROLES.includes(role)) {
      return reply.status(400).send({ success: false, error: 'Invalid role' });
    }
    const password_hash = await bcrypt.hash(password, 10);
    try {
      const { rows } = await pool.query(
        `INSERT INTO users (email, password_hash, full_name, role)
         VALUES ($1, $2, $3, $4)
         RETURNING id, email, full_name, role, is_active, created_at`,
        [email.toLowerCase().trim(), password_hash, full_name, role]
      );
      const newUser = rows[0];
      await logEvent({
        action: 'user.created',
        entity_type: 'user',
        entity_id: newUser.id,
        performed_by: request.user.full_name,
        ip_address: getIp(request),
        details: { email: newUser.email, role: newUser.role },
      });
      return reply.status(201).send(newUser);
    } catch (err) {
      if (err.code === '23505') {
        return reply.status(409).send({ success: false, error: 'Email already exists' });
      }
      throw err;
    }
  });

  // PUT /:id - update user
  fastify.put('/:id', { preHandler: adminOnly }, async (request, reply) => {
    const { full_name, role, is_active, password } = request.body || {};
    if (request.params.id === request.user.id && is_active === false) {
      return reply.status(400).send({ success: false, error: 'Cannot deactivate your own account' });
    }
    if (role && !VALID_ROLES.includes(role)) {
      return reply.status(400).send({ success: false, error: 'Invalid role' });
    }
    const password_hash = password ? await bcrypt.hash(password, 10) : null;
    const { rows } = await pool.query(
      `UPDATE users
       SET full_name = COALESCE($1, full_name),
           role = COALESCE($2, role),
           is_active = COALESCE($3, is_active),
           password_hash = COALESCE($4, password_hash),
           updated_at = NOW()
       WHERE id = $5
       RETURNING id, email, full_name, role, is_active, created_at`,
      [full_name || null, role || null, is_active ?? null, password_hash, request.params.id]
    );
    if (!rows.length) {
      return reply.status(404).send({ success: false, error: 'User not found' });
    }
    // Build list of changed field names (never log values — no passwords, no PII beyond what's needed)
    const changedFields = [];
    if (full_name  != null) changedFields.push('full_name');
    if (role       != null) changedFields.push('role');
    if (is_active  != null) changedFields.push('is_active');
    if (password   != null) changedFields.push('password');
    await logEvent({
      action: 'user.updated',
      entity_type: 'user',
      entity_id: request.params.id,
      performed_by: request.user.full_name,
      ip_address: getIp(request),
      details: { email: rows[0].email, changed_fields: changedFields },
    });
    return rows[0];
  });

  // DELETE /:id - soft-delete (deactivate)
  fastify.delete('/:id', { preHandler: adminOnly }, async (request, reply) => {
    if (request.params.id === request.user.id) {
      return reply.status(400).send({ success: false, error: 'Cannot delete your own account' });
    }
    const { rows } = await pool.query(
      `UPDATE users SET is_active = false, updated_at = NOW()
       WHERE id = $1 RETURNING id, email, full_name`,
      [request.params.id]
    );
    if (!rows.length) {
      return reply.status(404).send({ success: false, error: 'User not found' });
    }
    await logEvent({
      action: 'user.deactivated',
      entity_type: 'user',
      entity_id: request.params.id,
      performed_by: request.user.full_name,
      ip_address: getIp(request),
      details: { email: rows[0].email, full_name: rows[0].full_name },
    });
    return reply.status(204).send();
  });
}

module.exports = routes;
