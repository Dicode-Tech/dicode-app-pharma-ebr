const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');

async function routes(fastify) {
  // GET / - global audit trail with optional entity_type filter
  fastify.get('/', { preHandler: [authenticate] }, async (request) => {
    const limit  = Math.min(parseInt(request.query.limit)  || 50, 200);
    const offset = parseInt(request.query.offset) || 0;
    const entity_type = request.query.entity_type || null;

    const conditions = [];
    const params = [];

    if (entity_type) {
      params.push(entity_type);
      conditions.push(`al.entity_type = $${params.length}`);
    }

    params.push(limit, offset);
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows } = await pool.query(
      `SELECT
         al.*,
         b.batch_number,
         bs.step_number,
         bs.description AS step_description,
         -- entity_name: human-readable name of the affected entity
         CASE
           WHEN al.entity_type = 'batch'   THEN b.batch_number
           WHEN al.entity_type = 'recipe'  THEN r.name
           WHEN al.entity_type = 'user'    THEN u.full_name
           WHEN al.entity_type = 'session' THEN u2.full_name
           ELSE NULL
         END AS entity_name
       FROM audit_logs al
       LEFT JOIN batches    b  ON b.id  = al.batch_id
       LEFT JOIN batch_steps bs ON bs.id = al.step_id
       LEFT JOIN recipes    r  ON r.id  = al.entity_id AND al.entity_type = 'recipe'
       LEFT JOIN users      u  ON u.id  = al.entity_id AND al.entity_type = 'user'
       LEFT JOIN users      u2 ON u2.id = al.entity_id AND al.entity_type = 'session'
       ${where}
       ORDER BY al.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return rows;
  });
}

module.exports = routes;
