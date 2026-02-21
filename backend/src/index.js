const fastify = require('fastify')({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.LOG_PRETTY === 'true' ? {
      target: 'pino-pretty',
      options: {
        colorize: true
      }
    } : undefined
  }
});

// Register plugins
fastify.register(require('@fastify/cors'), {
  origin: ['http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
});

fastify.register(require('@fastify/cookie'));

// Health check endpoint
fastify.get('/health', async () => {
  return { 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  };
});

// Register routes
fastify.register(require('./routes/auth'), { prefix: '/api/v1/auth' });
fastify.register(require('./routes/users'), { prefix: '/api/v1/users' });
fastify.register(require('./routes/batches'), { prefix: '/api/v1/batches' });
fastify.register(require('./routes/recipes'), { prefix: '/api/v1/recipes' });
fastify.register(require('./routes/audit'), { prefix: '/api/v1/audit' });
fastify.register(require('./routes/integrations'), { prefix: '/api/v1/integrations' });
fastify.register(require('./routes/tenant'), { prefix: '/api/v1/tenant' });

// Error handler
fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error(error);
  
  reply.status(error.statusCode || 500).send({
    success: false,
    error: error.message || 'Internal Server Error',
    code: error.code || 'INTERNAL_ERROR'
  });
});

// Not found handler
fastify.setNotFoundHandler((request, reply) => {
  reply.status(404).send({
    success: false,
    error: 'Route not found',
    code: 'NOT_FOUND'
  });
});

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.PORT) || 3000;
    const host = process.env.HOST || '0.0.0.0';
    
    await fastify.listen({ port, host });
    fastify.log.info(`Server listening on ${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
