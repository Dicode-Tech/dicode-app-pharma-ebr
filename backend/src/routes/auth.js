const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { authenticate, JWT_SECRET } = require('../middleware/auth');

async function routes(fastify) {
  // POST /login
  fastify.post('/login', async (request, reply) => {
    const { email, password } = request.body || {};
    if (!email || !password) {
      return reply.status(400).send({ success: false, error: 'Email and password required' });
    }

    const { rows } = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND is_active = true',
      [email.toLowerCase().trim()]
    );

    if (!rows.length) {
      return reply.status(401).send({ success: false, error: 'Invalid credentials' });
    }

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return reply.status(401).send({ success: false, error: 'Invalid credentials' });
    }

    const payload = { id: user.id, email: user.email, full_name: user.full_name, role: user.role };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

    reply.setCookie('token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 86400,
    });

    return { id: user.id, email: user.email, full_name: user.full_name, role: user.role };
  });

  // POST /logout
  fastify.post('/logout', async (request, reply) => {
    reply.clearCookie('token', { path: '/' });
    return { success: true };
  });

  // GET /me
  fastify.get('/me', { preHandler: [authenticate] }, async (request, reply) => {
    const { rows } = await pool.query(
      'SELECT id, email, full_name, role, is_active FROM users WHERE id = $1 AND is_active = true',
      [request.user.id]
    );
    if (!rows.length) {
      reply.clearCookie('token', { path: '/' });
      return reply.status(401).send({ success: false, error: 'User not found or deactivated' });
    }
    return rows[0];
  });
}

module.exports = routes;
