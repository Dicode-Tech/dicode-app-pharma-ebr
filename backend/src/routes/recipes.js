const pool = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');

const allRoles = [authenticate];
const editors = [authenticate, requireRole('admin', 'batch_manager')];

// ─── XML helpers ─────────────────────────────────────────────────────────────

function escapeXml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function extractXmlTag(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return m ? m[1].trim() : '';
}

function parseXmlImport(xmlStr) {
  const name = extractXmlTag(xmlStr, 'Name');
  const product_name = extractXmlTag(xmlStr, 'ProductName');
  const version = extractXmlTag(xmlStr, 'Version') || '1.0';
  const description = extractXmlTag(xmlStr, 'Description');

  const steps = [];
  const stepRegex = /<RecipeStep[^>]*stepNumber="(\d+)"[^>]*>([\s\S]*?)<\/RecipeStep>/gi;
  let m;
  while ((m = stepRegex.exec(xmlStr)) !== null) {
    const block = m[2];
    const ev = extractXmlTag(block, 'ExpectedValue');
    const evUnit = (block.match(/<ExpectedValue[^>]*unit="([^"]*)"/) || [])[1] || null;
    steps.push({
      step_number: parseInt(m[1], 10),
      description: extractXmlTag(block, 'Description'),
      step_type: extractXmlTag(block, 'StepType') || 'manual',
      instructions: extractXmlTag(block, 'Instructions') || null,
      expected_value: ev ? parseFloat(ev) : null,
      unit: evUnit,
      requires_signature: extractXmlTag(block, 'RequiresSignature') === 'true',
      duration_minutes: extractXmlTag(block, 'DurationMinutes')
        ? parseInt(extractXmlTag(block, 'DurationMinutes'), 10)
        : null,
    });
  }
  steps.sort((a, b) => a.step_number - b.step_number);
  return { name, product_name, version, description, steps };
}

// ─── Shared step insert helper ────────────────────────────────────────────────

async function insertSteps(client, recipeId, steps) {
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    await client.query(
      `INSERT INTO recipe_steps
         (recipe_id, step_number, description, instructions,
          step_type, expected_value, unit, requires_signature, duration_minutes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        recipeId,
        i + 1,
        s.description,
        s.instructions || null,
        s.step_type || 'manual',
        s.expected_value != null ? s.expected_value : null,
        s.unit || null,
        s.requires_signature || false,
        s.duration_minutes || null,
      ]
    );
  }
}

// ─── Routes ───────────────────────────────────────────────────────────────────

async function routes(fastify) {
  // GET / - list all recipes
  fastify.get('/', { preHandler: allRoles }, async () => {
    const { rows } = await pool.query(
      'SELECT * FROM recipes ORDER BY created_at DESC'
    );
    return rows;
  });

  // GET /:id - get single recipe with steps
  fastify.get('/:id', { preHandler: allRoles }, async (request, reply) => {
    const { rows } = await pool.query(
      'SELECT * FROM recipes WHERE id = $1',
      [request.params.id]
    );
    if (!rows.length) {
      return reply.status(404).send({ success: false, error: 'Recipe not found' });
    }
    const { rows: steps } = await pool.query(
      'SELECT * FROM recipe_steps WHERE recipe_id = $1 ORDER BY step_number',
      [request.params.id]
    );
    return { ...rows[0], steps };
  });

  // GET /:id/export - export recipe as JSON or BatchML XML
  fastify.get('/:id/export', { preHandler: allRoles }, async (request, reply) => {
    const format = request.query.format || 'json';
    const { rows } = await pool.query(
      'SELECT * FROM recipes WHERE id = $1',
      [request.params.id]
    );
    if (!rows.length) {
      return reply.status(404).send({ success: false, error: 'Recipe not found' });
    }
    const recipe = rows[0];
    const { rows: steps } = await pool.query(
      'SELECT * FROM recipe_steps WHERE recipe_id = $1 ORDER BY step_number',
      [request.params.id]
    );

    const safeName = recipe.name.replace(/[^a-z0-9_-]/gi, '_');

    if (format === 'xml') {
      const stepsXml = steps.map(s => `
    <RecipeStep stepNumber="${s.step_number}">
      <Description>${escapeXml(s.description)}</Description>
      <StepType>${escapeXml(s.step_type)}</StepType>
      <Instructions>${escapeXml(s.instructions)}</Instructions>
      ${s.expected_value != null ? `<ExpectedValue unit="${escapeXml(s.unit)}">${s.expected_value}</ExpectedValue>` : '<ExpectedValue/>'}
      <RequiresSignature>${s.requires_signature}</RequiresSignature>
      <DurationMinutes>${s.duration_minutes != null ? s.duration_minutes : ''}</DurationMinutes>
    </RecipeStep>`).join('');

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<BatchML xmlns="urn:BatchML:V0410" version="04.10">
  <Header>
    <ID>${escapeXml(recipe.id)}</ID>
    <Name>${escapeXml(recipe.name)}</Name>
    <Description>${escapeXml(recipe.description)}</Description>
    <Version>${escapeXml(recipe.version)}</Version>
    <ProductName>${escapeXml(recipe.product_name)}</ProductName>
    <Author>${escapeXml(recipe.created_by)}</Author>
    <ExportedOn>${new Date().toISOString()}</ExportedOn>
    <Source>Dicode EBR</Source>
  </Header>
  <RecipeBody>${stepsXml}
  </RecipeBody>
</BatchML>`;

      reply.header('Content-Type', 'application/xml');
      reply.header('Content-Disposition', `attachment; filename="${safeName}.xml"`);
      return reply.send(xml);
    }

    // Default: JSON
    const payload = {
      format: 'dicode-ebr-recipe',
      version: '1.0',
      exportedAt: new Date().toISOString(),
      recipe: {
        name: recipe.name,
        product_name: recipe.product_name,
        version: recipe.version,
        description: recipe.description || null,
        steps: steps.map(s => ({
          step_number: s.step_number,
          description: s.description,
          step_type: s.step_type,
          instructions: s.instructions || null,
          expected_value: s.expected_value != null ? parseFloat(s.expected_value) : null,
          unit: s.unit || null,
          requires_signature: s.requires_signature,
          duration_minutes: s.duration_minutes || null,
        })),
      },
    };

    reply.header('Content-Disposition', `attachment; filename="${safeName}.json"`);
    return reply.send(payload);
  });

  // POST / - create recipe with all step fields
  fastify.post('/', { preHandler: editors }, async (request, reply) => {
    const { name, product_name, version, description, steps = [] } = request.body;
    const created_by = request.user.full_name;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        `INSERT INTO recipes (name, product_name, version, description, created_by)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [name, product_name, version || '1.0', description, created_by]
      );
      const recipe = rows[0];
      await insertSteps(client, recipe.id, steps);
      await client.query('COMMIT');
      return reply.status(201).send(recipe);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  });

  // POST /import - import recipe from JSON or BatchML XML
  fastify.post('/import', { preHandler: editors }, async (request, reply) => {
    const { format, data } = request.body;
    let parsed;

    if (format === 'xml') {
      parsed = parseXmlImport(typeof data === 'string' ? data : JSON.stringify(data));
    } else {
      // JSON — data is the envelope or recipe object
      const envelope = typeof data === 'string' ? JSON.parse(data) : data;
      const r = envelope.recipe || envelope;
      parsed = {
        name: r.name,
        product_name: r.product_name,
        version: r.version || '1.0',
        description: r.description || null,
        steps: r.steps || [],
      };
    }

    if (!parsed.name || !parsed.product_name) {
      return reply.status(400).send({ error: 'Recipe name and product_name are required' });
    }

    const created_by = request.user.full_name;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        `INSERT INTO recipes (name, product_name, version, description, created_by)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [parsed.name, parsed.product_name, parsed.version, parsed.description, created_by]
      );
      const recipe = rows[0];
      await insertSteps(client, recipe.id, parsed.steps);
      await client.query('COMMIT');
      return reply.status(201).send(recipe);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  });

  // PUT /:id - update recipe header and replace all steps
  fastify.put('/:id', { preHandler: editors }, async (request, reply) => {
    const { name, product_name, version, description, steps } = request.body;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        `UPDATE recipes
         SET name = COALESCE($1, name),
             product_name = COALESCE($2, product_name),
             version = COALESCE($3, version),
             description = COALESCE($4, description),
             updated_at = NOW()
         WHERE id = $5
         RETURNING *`,
        [name, product_name, version, description, request.params.id]
      );
      if (!rows.length) {
        await client.query('ROLLBACK');
        return reply.status(404).send({ success: false, error: 'Recipe not found' });
      }
      if (Array.isArray(steps)) {
        await client.query('DELETE FROM recipe_steps WHERE recipe_id = $1', [request.params.id]);
        await insertSteps(client, request.params.id, steps);
      }
      await client.query('COMMIT');
      return rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  });

  // DELETE /:id - delete recipe
  fastify.delete('/:id', { preHandler: editors }, async (request, reply) => {
    const { rowCount } = await pool.query(
      'DELETE FROM recipes WHERE id = $1',
      [request.params.id]
    );
    if (!rowCount) {
      return reply.status(404).send({ success: false, error: 'Recipe not found' });
    }
    return reply.status(204).send();
  });
}

module.exports = routes;
