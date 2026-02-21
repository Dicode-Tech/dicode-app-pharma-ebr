const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');

async function routes(fastify) {
  fastify.get('/settings', { preHandler: [authenticate] }, async (request, reply) => {
    const { rows } = await pool.query(
      `SELECT t.id, t.slug, t.name, t.is_active,
              COALESCE(ts.branding, '{}'::jsonb) AS branding,
              COALESCE(ts.feature_flags, '{}'::jsonb) AS feature_flags,
              COALESCE(ts.compliance, '{}'::jsonb) AS compliance
       FROM tenants t
       LEFT JOIN tenant_settings ts ON ts.tenant_id = t.id
       WHERE t.id = $1`,
      [request.tenant.id]
    );
    if (!rows.length || !rows[0].is_active) {
      return reply.status(404).send({ success: false, error: 'Tenant not found or inactive' });
    }
    const tenant = rows[0];
    return {
      tenant: { id: tenant.id, slug: tenant.slug, name: tenant.name },
      branding: tenant.branding,
      feature_flags: tenant.feature_flags,
      compliance: tenant.compliance,
    };
  });
}

module.exports = routes;
