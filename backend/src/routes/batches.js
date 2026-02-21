const pool = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');
const { logEvent, getIp } = require('../utils/audit');

const allRoles = [authenticate];
const writers  = [authenticate, requireRole('admin', 'batch_manager', 'operator_supervisor', 'operator')];
const managers = [authenticate, requireRole('admin', 'batch_manager', 'operator_supervisor')];

const tenantId = (request) => request.tenant.id;

async function ensureRecipeBelongsToTenant(recipeId, tenant) {
  if (!recipeId) return true;
  const { rowCount } = await pool.query('SELECT 1 FROM recipes WHERE id = $1 AND tenant_id = $2', [recipeId, tenant]);
  return rowCount > 0;
}

async function routes(fastify) {
  // GET / - list all batches
  fastify.get('/', { preHandler: allRoles }, async (request) => {
    const { rows } = await pool.query(
      `SELECT b.*,
              COUNT(bs.id) AS total_steps,
              COUNT(bs.id) FILTER (WHERE bs.status IN ('completed', 'skipped')) AS completed_steps
       FROM batches b
       LEFT JOIN batch_steps bs ON bs.batch_id = b.id AND bs.tenant_id = $1
       WHERE b.tenant_id = $1
       GROUP BY b.id
       ORDER BY b.created_at DESC`,
      [tenantId(request)]
    );
    return rows;
  });

  // GET /:id - get single batch
  fastify.get('/:id', { preHandler: allRoles }, async (request, reply) => {
    const { rows } = await pool.query(
      `SELECT b.*,
              COUNT(bs.id) AS total_steps,
              COUNT(bs.id) FILTER (WHERE bs.status IN ('completed', 'skipped')) AS completed_steps
       FROM batches b
       LEFT JOIN batch_steps bs ON bs.batch_id = b.id AND bs.tenant_id = $2
       WHERE b.id = $1 AND b.tenant_id = $2
       GROUP BY b.id`,
      [request.params.id, tenantId(request)]
    );
    if (!rows.length) {
      return reply.status(404).send({ success: false, error: 'Batch not found' });
    }
    return rows[0];
  });

  // POST / - create batch
  fastify.post('/', { preHandler: writers }, async (request, reply) => {
    const { batch_number, product_name, batch_size, recipe_id } = request.body;
    const created_by = request.user.full_name;
    const tenant = tenantId(request);

    if (recipe_id) {
      const allowed = await ensureRecipeBelongsToTenant(recipe_id, tenant);
      if (!allowed) {
        return reply.status(400).send({ success: false, error: 'Recipe not found for this tenant' });
      }
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        `INSERT INTO batches (tenant_id, batch_number, product_name, batch_size, created_by, recipe_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [tenant, batch_number, product_name, batch_size, created_by, recipe_id || null]
      );
      const batch = rows[0];

      if (recipe_id) {
        const { rows: recipeSteps } = await client.query(
          'SELECT * FROM recipe_steps WHERE recipe_id = $1 AND tenant_id = $2 ORDER BY step_number',
          [recipe_id, tenant]
        );
        for (const step of recipeSteps) {
          await client.query(
            `INSERT INTO batch_steps (tenant_id, batch_id, step_number, description, instructions, step_type, expected_value, unit, requires_signature)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [tenant, batch.id, step.step_number, step.description, step.instructions, step.step_type, step.expected_value, step.unit, step.requires_signature]
          );
        }
      }

      await client.query('COMMIT');

      await logEvent({
        tenant_id: tenant,
        action: 'batch.created',
        entity_type: 'batch',
        entity_id: batch.id,
        batch_id: batch.id,
        performed_by: created_by,
        ip_address: getIp(request),
        details: { batch_number },
      });

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
       WHERE id = $1 AND tenant_id = $2 AND status = 'draft' RETURNING *`,
      [request.params.id, tenantId(request)]
    );
    if (!rows.length) {
      return reply.status(404).send({ success: false, error: 'Batch not found or already started' });
    }
    await logEvent({
      tenant_id: tenantId(request),
      action: 'batch.started',
      entity_type: 'batch',
      entity_id: request.params.id,
      batch_id: request.params.id,
      performed_by,
      ip_address: getIp(request),
      details: { batch_number: rows[0].batch_number },
    });
    return rows[0];
  });

  // POST /:id/complete
  fastify.post('/:id/complete', { preHandler: managers }, async (request, reply) => {
    const performed_by = request.user.full_name;
    const { rows } = await pool.query(
      `UPDATE batches SET status = 'completed', completed_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2 AND status = 'active' RETURNING *`,
      [request.params.id, tenantId(request)]
    );
    if (!rows.length) {
      return reply.status(404).send({ success: false, error: 'Batch not found or not active' });
    }
    await logEvent({
      tenant_id: tenantId(request),
      action: 'batch.completed',
      entity_type: 'batch',
      entity_id: request.params.id,
      batch_id: request.params.id,
      performed_by,
      ip_address: getIp(request),
      details: { batch_number: rows[0].batch_number },
    });
    return rows[0];
  });

  // POST /:id/cancel
  fastify.post('/:id/cancel', { preHandler: managers }, async (request, reply) => {
    const performed_by = request.user.full_name;
    const { reason } = request.body || {};
    const { rows } = await pool.query(
      `UPDATE batches SET status = 'cancelled', updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2 AND status IN ('draft', 'active') RETURNING *`,
      [request.params.id, tenantId(request)]
    );
    if (!rows.length) {
      return reply.status(404).send({ success: false, error: 'Batch not found or already completed' });
    }
    await logEvent({
      tenant_id: tenantId(request),
      action: 'batch.cancelled',
      entity_type: 'batch',
      entity_id: request.params.id,
      batch_id: request.params.id,
      performed_by,
      ip_address: getIp(request),
      details: { reason: reason || 'No reason provided' },
    });
    return rows[0];
  });

  // GET /:id/steps
  fastify.get('/:id/steps', { preHandler: allRoles }, async (request) => {
    const { rows } = await pool.query(
      'SELECT * FROM batch_steps WHERE batch_id = $1 AND tenant_id = $2 ORDER BY step_number',
      [request.params.id, tenantId(request)]
    );
    return rows;
  });

  // PUT /:id/steps/:stepId - update step
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
       WHERE id = $6 AND batch_id = $7 AND tenant_id = $8
       RETURNING *`,
      [status, performed_by, notes, actual_value, now, request.params.stepId, request.params.id, tenantId(request)]
    );
    if (!rows.length) {
      return reply.status(404).send({ success: false, error: 'Step not found' });
    }
    const step = rows[0];
    const actionMap = {
      in_progress: 'batch.step.started',
      completed:   'batch.step.completed',
      skipped:     'batch.step.skipped',
    };
    await logEvent({
      tenant_id: tenantId(request),
      action: actionMap[status] || `batch.step.${status}`,
      entity_type: 'batch',
      entity_id: request.params.id,
      batch_id: request.params.id,
      step_id: step.id,
      performed_by,
      ip_address: getIp(request),
      details: { step_number: step.step_number, description: step.description, actual_value },
    });
    return step;
  });

  // POST /:id/steps/:stepId/sign
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
       WHERE id = $5 AND batch_id = $6 AND tenant_id = $7
       RETURNING *`,
      [performed_by, signature_data, notes, actual_value || null, request.params.stepId, request.params.id, tenantId(request)]
    );
    if (!rows.length) {
      return reply.status(404).send({ success: false, error: 'Step not found' });
    }
    const step = rows[0];
    await logEvent({
      tenant_id: tenantId(request),
      action: 'batch.step.signed',
      entity_type: 'batch',
      entity_id: request.params.id,
      batch_id: request.params.id,
      step_id: step.id,
      performed_by,
      ip_address: getIp(request),
      details: { step_number: step.step_number, description: step.description, actual_value },
    });
    return step;
  });

  // GET /:id/audit
  fastify.get('/:id/audit', { preHandler: allRoles }, async (request) => {
    const { rows } = await pool.query(
      `SELECT al.*, bs.step_number, bs.description AS step_description
       FROM audit_logs al
       LEFT JOIN batch_steps bs ON bs.id = al.step_id AND bs.tenant_id = $2
       WHERE al.batch_id = $1 AND al.tenant_id = $2
       ORDER BY al.created_at DESC`,
      [request.params.id, tenantId(request)]
    );
    return rows;
  });

  // GET /audit/all - tenant scoped audit trail
  fastify.get('/audit/all', { preHandler: allRoles }, async (request) => {
    const limit  = parseInt(request.query.limit)  || 100;
    const offset = parseInt(request.query.offset) || 0;
    const { rows } = await pool.query(
      `SELECT al.*, b.batch_number, bs.step_number, bs.description AS step_description
       FROM audit_logs al
       LEFT JOIN batches b ON b.id = al.batch_id
       LEFT JOIN batch_steps bs ON bs.id = al.step_id
       WHERE al.tenant_id = $1
       ORDER BY al.created_at DESC
       LIMIT $2 OFFSET $3`,
      [tenantId(request), limit, offset]
    );
    return rows;
  });

  // POST /:id/report - generate PDF report
  fastify.post('/:id/report', { preHandler: managers }, async (request, reply) => {
    const generated_by = request.user.full_name;
    const tenant = tenantId(request);

    const { rows: batchRows } = await pool.query('SELECT * FROM batches WHERE id = $1 AND tenant_id = $2', [request.params.id, tenant]);
    if (!batchRows.length) return reply.status(404).send({ success: false, error: 'Batch not found' });
    const batch = batchRows[0];
    if (batch.status !== 'completed') {
      return reply.status(400).send({ success: false, error: 'Report can only be generated for completed batches' });
    }

    const { rows: steps } = await pool.query(
      'SELECT * FROM batch_steps WHERE batch_id = $1 AND tenant_id = $2 ORDER BY step_number', [batch.id, tenant]
    );
    const { rows: auditLogs } = await pool.query(
      'SELECT * FROM audit_logs WHERE batch_id = $1 AND tenant_id = $2 ORDER BY created_at ASC', [batch.id, tenant]
    );

    const pdfGenerator = require('../services/pdf-generator');
    const reportPath = await pdfGenerator.generateBatchReport({ batch, steps, auditLogs, generatedBy: generated_by });

    await pool.query(
      'INSERT INTO pdf_reports (tenant_id, batch_id, file_path, generated_by) VALUES ($1, $2, $3, $4)',
      [tenant, batch.id, reportPath, generated_by]
    );

    await logEvent({
      tenant_id: tenant,
      action: 'batch.report.generated',
      entity_type: 'batch',
      entity_id: batch.id,
      batch_id: batch.id,
      performed_by: generated_by,
      ip_address: getIp(request),
      details: { batch_number: batch.batch_number },
    });

    return { success: true, reportId: batch.id };
  });

  // GET /:id/report/download - download PDF report
  fastify.get('/:id/report/download', { preHandler: allRoles }, async (request, reply) => {
    const { rows } = await pool.query(
      'SELECT * FROM pdf_reports WHERE batch_id = $1 AND tenant_id = $2 ORDER BY created_at DESC LIMIT 1',
      [request.params.id, tenantId(request)]
    );
    if (!rows.length) {
      return reply.status(404).send({ success: false, error: 'No report found for this batch' });
    }
    const fs = require('fs');
    const filePath = rows[0].file_path;
    if (!fs.existsSync(filePath)) {
      return reply.status(404).send({ success: false, error: 'Report file not found on disk' });
    }
    const fileName = `batch-record-${request.params.id}.pdf`;
    reply.header('Content-Type', 'application/pdf');
    reply.header('Content-Disposition', `attachment; filename="${fileName}"`);
    return reply.send(fs.createReadStream(filePath));
  });
}

module.exports = routes;
