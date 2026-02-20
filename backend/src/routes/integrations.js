const opcua = require('../services/opcua');
const { authenticate } = require('../middleware/auth');

async function routes(fastify) {
  // GET /status - OPC-UA connection status
  fastify.get('/status', { preHandler: [authenticate] }, async () => {
    return {
      connected: true,
      endpoint: process.env.OPCUA_ENDPOINT || 'opc.tcp://localhost:4840',
      server: 'Dicode EBR Simulation Server v1.0',
      session_id: 'SIM-' + Math.floor(Date.now() / 60000),
      timestamp: new Date().toISOString(),
    };
  });

  // GET /readings - live process variable readings
  fastify.get('/readings', { preHandler: [authenticate] }, async () => {
    return {
      readings: opcua.getReadings(),
      timestamp: new Date().toISOString(),
    };
  });

  // GET /equipment - equipment status
  fastify.get('/equipment', { preHandler: [authenticate] }, async () => {
    return {
      equipment: opcua.getEquipmentStatus(),
      timestamp: new Date().toISOString(),
    };
  });

  // GET /alarms - active alarms
  fastify.get('/alarms', { preHandler: [authenticate] }, async () => {
    return {
      alarms: opcua.getAlarms(),
      timestamp: new Date().toISOString(),
    };
  });
}

module.exports = routes;
