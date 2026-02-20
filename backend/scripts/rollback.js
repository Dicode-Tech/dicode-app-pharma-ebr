require('dotenv').config();
const pool = require('../src/config/database');

async function rollback() {
  const client = await pool.connect();
  try {
    console.log('Rolling back all tables...');
    await client.query(`
      DROP TABLE IF EXISTS pdf_reports CASCADE;
      DROP TABLE IF EXISTS audit_logs CASCADE;
      DROP TABLE IF EXISTS batch_steps CASCADE;
      DROP TABLE IF EXISTS batches CASCADE;
      DROP TABLE IF EXISTS recipe_steps CASCADE;
      DROP TABLE IF EXISTS recipes CASCADE;
    `);
    console.log('Rollback completed successfully.');
  } catch (err) {
    console.error('Rollback failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

rollback();
