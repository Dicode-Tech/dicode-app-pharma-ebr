const pool = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');

const allRoles = [authenticate];
const writers = [authenticate, requireRole('admin', 'batch_manager', 'operator_supervisor', 'operator')];
const managers = [authenticate, requireRole('admin', 'batch_manager', 'operator_supervisor')];

async function routes(fastify) {
  // GET / - list all batches with step progress
  fastify.get('/', { preHandler: allRoles }, async (request, reply) => {
    const { rows } = await pool.query(`
      SELECT b.*,
        COUNT(bs.id)::int AS total_steps,
        COUNT(bs.id) FILTER (WHERE bs.status = 'completed')::int AS completed_steps
      FROM batches b
      LEFT JOIN batch_steps bs ON bs.batch_id = b.id
      GROUP BY b.id
      ORDER BY b.created_at DESC
    `);
    return rows;
  });

  // GET /:id - get single batch with step progress
  fastify.get('/:id', { preHandler: allRoles }, async (request, reply) => {
    const { rows } = await pool.query(`
      SELECT b.*,
        COUNT(bs.id)::int AS total_steps,
        COUNT(bs.id) FILTER (WHERE bs.status = 'completed')::int AS completed_steps
      FROM batches b
      LEFT JOIN batch_steps bs ON bs.batch_id = b.id
      WHERE b.id = $1
      GROUP BY b.id
    `, [request.params.id]);
    if (!rows.length) {
      return reply.status(404).send({ success: false, error: 'Batch not found' });
    }
    return rows[0];
  });

  // POST / - create batch, copy steps from recipe if provided
  fastify.post('/', { preHandler: writers }, async (request, reply) => {
    const { batch_number, product_name, batch_size, recipe_id } = request.body;
    const created_by = request.user.full_name;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { rows } = await client.query(
        `INSERT INTO batches (batch_number, product_name, batch_size, created_by, status, recipe_id)
         VALUES ($1, $2, $3, $4, 'draft', $5)
         RETURNING *`,
        [batch_number, product_name, batch_size, created_by, recipe_id || null]
      );
      const batch = rows[0];

      if (recipe_id) {
        const { rows: recipeSteps } = await client.query(
          'SELECT * FROM recipe_steps WHERE recipe_id = $1 ORDER BY step_number',
          [recipe_id]
        );
        for (const step of recipeSteps) {
          await client.query(
            `INSERT INTO batch_steps (batch_id, step_number, description, instructions, step_type, expected_value, unit, requires_signature)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [batch.id, step.step_number, step.description, step.instructions, step.step_type, step.expected_value, step.unit, step.requires_signature]
          );
        }
      }

      await client.query(
        `INSERT INTO audit_logs (batch_id, action, performed_by, details) VALUES ($1, 'batch_created', $2, $3)`,
        [batch.id, created_by, JSON.stringify({ batch_number })]
      );

      await client.query('COMMIT');
      return reply.status(201).send(batch);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  });

  // POST /:id/start
  fastify.post('/:id/start', { preHandler: managers }, async (request, reply) => {
    const performed_by = request.user.full_name;
    const { rows } = await pool.query(
      `UPDATE batches SET status = 'active', started_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND status = 'draft' RETURNING *`,
      [request.params.id]
    );
    if (!rows.length) {
      return reply.status(404).send({ success: false, error: 'Batch not found or already started' });
    }
    await pool.query(
      `INSERT INTO audit_logs (batch_id, action, performed_by, details) VALUES ($1, 'start', $2, $3)`,
      [request.params.id, performed_by, JSON.stringify({ batch_number: rows[0].batch_number })]
    );
    return rows[0];
  });

  // POST /:id/complete
  fastify.post('/:id/complete', { preHandler: managers }, async (request, reply) => {
    const performed_by = request.user.full_name;
    const { rows } = await pool.query(
      `UPDATE batches SET status = 'completed', completed_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND status = 'active' RETURNING *`,
      [request.params.id]
    );
    if (!rows.length) {
      return reply.status(404).send({ success: false, error: 'Batch not found or not active' });
    }
    await pool.query(
      `INSERT INTO audit_logs (batch_id, action, performed_by, details) VALUES ($1, 'complete', $2, $3)`,
      [request.params.id, performed_by, JSON.stringify({ batch_number: rows[0].batch_number })]
    );
    return rows[0];
  });

  // POST /:id/cancel
  fastify.post('/:id/cancel', { preHandler: managers }, async (request, reply) => {
    const performed_by = request.user.full_name;
    const { reason } = request.body || {};
    const { rows } = await pool.query(
      `UPDATE batches SET status = 'cancelled', updated_at = NOW()
       WHERE id = $1 AND status IN ('draft', 'active') RETURNING *`,
      [request.params.id]
    );
    if (!rows.length) {
      return reply.status(404).send({ success: false, error: 'Batch not found or already completed' });
    }
    await pool.query(
      `INSERT INTO audit_logs (batch_id, action, performed_by, details) VALUES ($1, 'cancel', $2, $3)`,
      [request.params.id, performed_by, JSON.stringify({ reason: reason || 'No reason provided' })]
    );
    return rows[0];
  });

  // GET /:id/steps
  fastify.get('/:id/steps', { preHandler: allRoles }, async (request, reply) => {
    const { rows } = await pool.query(
      'SELECT * FROM batch_steps WHERE batch_id = $1 ORDER BY step_number',
      [request.params.id]
    );
    return rows;
  });

  // PUT /:id/steps/:stepId - update step (start or complete without signature)
  fastify.put('/:id/steps/:stepId', { preHandler: writers }, async (request, reply) => {
    const { status, notes, actual_value } = request.body;
    const performed_by = request.user.full_name;
    const now = new Date();
    const { rows } = await pool.query(
      `UPDATE batch_steps
       SET status = $1::varchar,
           performed_by = COALESCE($2, performed_by),
           notes = COALESCE($3, notes),
           actual_value = COALESCE($4, actual_value),
           started_at = CASE WHEN $1::text = 'in_progress' AND started_at IS NULL THEN $5 ELSE started_at END,
           completed_at = CASE WHEN $1::text IN ('completed', 'skipped') THEN $5 ELSE completed_at END
       WHERE id = $6 AND batch_id = $7
       RETURNING *`,
      [status, performed_by, notes, actual_value, now, request.params.stepId, request.params.id]
    );
    if (!rows.length) {
      return reply.status(404).send({ success: false, error: 'Step not found' });
    }
    const step = rows[0];
    await pool.query(
      `INSERT INTO audit_logs (batch_id, step_id, action, performed_by, details) VALUES ($1, $2, $3, $4, $5)`,
      [request.params.id, step.id, `step_${status}`, performed_by, JSON.stringify({ step_number: step.step_number, description: step.description, actual_value })]
    );
    return step;
  });

  // POST /:id/steps/:stepId/sign - complete step with e-signature
  fastify.post('/:id/steps/:stepId/sign', { preHandler: writers }, async (request, reply) => {
    const { signature_data, notes, actual_value } = request.body;
    const performed_by = request.user.full_name;
    const { rows } = await pool.query(
      `UPDATE batch_steps
       SET status = 'completed',
           performed_by = $1,
           signature_data = $2,
           notes = COALESCE($3, notes),
           actual_value = COALESCE($4, actual_value),
           started_at = CASE WHEN started_at IS NULL THEN NOW() ELSE started_at END,
           completed_at = NOW()
       WHERE id = $5 AND batch_id = $6
       RETURNING *`,
      [performed_by, signature_data, notes, actual_value || null, request.params.stepId, request.params.id]
    );
    if (!rows.length) {
      return reply.status(404).send({ success: false, error: 'Step not found' });
    }
    const step = rows[0];
    await pool.query(
      `INSERT INTO audit_logs (batch_id, step_id, action, performed_by, details) VALUES ($1, $2, 'step_signed', $3, $4)`,
      [request.params.id, step.id, performed_by, JSON.stringify({ step_number: step.step_number, description: step.description, actual_value })]
    );
    return step;
  });

  // GET /:id/audit - audit trail for a specific batch
  fastify.get('/:id/audit', { preHandler: allRoles }, async (request, reply) => {
    const { rows } = await pool.query(
      `SELECT al.*, bs.step_number, bs.description AS step_description
       FROM audit_logs al
       LEFT JOIN batch_steps bs ON bs.id = al.step_id
       WHERE al.batch_id = $1
       ORDER BY al.created_at DESC`,
      [request.params.id]
    );
    return rows;
  });

  // GET /audit/all - global audit trail
  fastify.get('/audit/all', { preHandler: allRoles }, async (request, reply) => {
    const limit = parseInt(request.query.limit) || 100;
    const offset = parseInt(request.query.offset) || 0;
    const { rows } = await pool.query(
      `SELECT al.*, b.batch_number, bs.step_number, bs.description AS step_description
       FROM audit_logs al
       LEFT JOIN batches b ON b.id = al.batch_id
       LEFT JOIN batch_steps bs ON bs.id = al.step_id
       ORDER BY al.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return rows;
  });

  // POST /:id/report - generate PDF report
  fastify.post('/:id/report', { preHandler: managers }, async (request, reply) => {
    const generated_by = request.user.full_name;

    const { rows: batchRows } = await pool.query('SELECT * FROM batches WHERE id = $1', [request.params.id]);
    if (!batchRows.length) return reply.status(404).send({ success: false, error: 'Batch not found' });
    const batch = batchRows[0];
    if (batch.status !== 'completed') {
      return reply.status(400).send({ success: false, error: 'Report can only be generated for completed batches' });
    }

    const { rows: steps } = await pool.query(
      'SELECT * FROM batch_steps WHERE batch_id = $1 ORDER BY step_number', [batch.id]
    );
    const { rows: auditLogs } = await pool.query(
      'SELECT * FROM audit_logs WHERE batch_id = $1 ORDER BY created_at ASC', [batch.id]
    );

    const pdfGenerator = require('../services/pdf-generator');
    const filePath = await pdfGenerator.generate(batch, steps, auditLogs);

    const { rows: reportRows } = await pool.query(
      `INSERT INTO pdf_reports (batch_id, file_path, generated_by) VALUES ($1, $2, $3) RETURNING id`,
      [batch.id, filePath, generated_by]
    );

    return { success: true, reportId: reportRows[0].id };
  });

  // GET /:id/report/download - stream PDF
  fastify.get('/:id/report/download', { preHandler: allRoles }, async (request, reply) => {
    const { rows } = await pool.query(
      'SELECT * FROM pdf_reports WHERE batch_id = $1 ORDER BY created_at DESC LIMIT 1',
      [request.params.id]
    );
    if (!rows.length) return reply.status(404).send({ success: false, error: 'No report found. Generate one first.' });

    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(__dirname, '../../', rows[0].file_path);

    if (!fs.existsSync(filePath)) {
      return reply.status(404).send({ success: false, error: 'PDF file not found on disk.' });
    }

    const stream = fs.createReadStream(filePath);
    reply.type('application/pdf');
    reply.header('Content-Disposition', `attachment; filename="batch-record-${request.params.id}.pdf"`);
    return reply.send(stream);
  });
}

module.exports = routes;
