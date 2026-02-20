const pool = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');

const allRoles = [authenticate];
const editors = [authenticate, requireRole('admin', 'batch_manager')];

async function routes(fastify) {
  // GET / - list all recipes
  fastify.get('/', { preHandler: allRoles }, async (request, reply) => {
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

  // POST / - create recipe
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
        [name, product_name, version, description, created_by]
      );
      const recipe = rows[0];
      for (let i = 0; i < steps.length; i++) {
        const s = steps[i];
        await client.query(
          `INSERT INTO recipe_steps (recipe_id, step_number, description, instructions)
           VALUES ($1, $2, $3, $4)`,
          [recipe.id, i + 1, s.description, s.instructions]
        );
      }
      await client.query('COMMIT');
      return reply.status(201).send(recipe);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  });

  // PUT /:id - update recipe
  fastify.put('/:id', { preHandler: editors }, async (request, reply) => {
    const { name, product_name, version, description } = request.body;
    const { rows } = await pool.query(
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
      return reply.status(404).send({ success: false, error: 'Recipe not found' });
    }
    return rows[0];
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
