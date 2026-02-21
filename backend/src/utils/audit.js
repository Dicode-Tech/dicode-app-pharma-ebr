/**
 * Shared audit logging utility.
 * All route handlers should call logEvent() instead of writing raw INSERT INTO audit_logs.
 */

const pool = require('../config/database');

/**
 * Extract the real client IP from a Fastify request.
 * Respects X-Forwarded-For when behind a proxy.
 */
function getIp(request) {
  const forwarded = request.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.ip || null;
}

/**
 * Write an audit log entry scoped to a tenant.
 *
 * @param {object} opts
 * @param {string}  opts.tenant_id    - Tenant UUID (required)
 * @param {string}  opts.action       - Dot-notation event code, e.g. 'batch.created'
 * @param {string}  [opts.entity_type] - 'batch' | 'recipe' | 'user' | 'session'
 * @param {string}  [opts.entity_id]   - UUID of the affected entity
 * @param {string}  [opts.batch_id]    - UUID FK into batches (for batch/step events)
 * @param {string}  [opts.step_id]     - UUID FK into batch_steps (for step events)
 * @param {string}  [opts.performed_by] - User's full name
 * @param {string}  [opts.ip_address]  - Client IP address
 * @param {object}  [opts.details]     - Arbitrary metadata (stored as JSONB)
 */
async function logEvent(opts = {}) {
  const tenantId = opts.tenant_id || opts.tenantId;
  if (!tenantId) {
    throw new Error('tenant_id is required to write audit logs');
  }

  const {
    action, entity_type, entity_id,
    batch_id, step_id,
    performed_by, ip_address, details,
  } = opts;

  await pool.query(
    `INSERT INTO audit_logs
       (tenant_id, action, entity_type, entity_id, batch_id, step_id, performed_by, ip_address, details)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      tenantId,
      action,
      entity_type || null,
      entity_id   || null,
      batch_id    || null,
      step_id     || null,
      performed_by || null,
      ip_address  || null,
      details ? JSON.stringify(details) : null,
    ]
  );
}

module.exports = { logEvent, getIp };
