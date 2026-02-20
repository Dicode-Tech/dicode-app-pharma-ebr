/**
 * migrate-audit-v2.js
 *
 * 1. Adds entity_type and entity_id columns to audit_logs
 * 2. Backfills entity_type/entity_id from existing batch data
 * 3. Normalises legacy action strings to dot-notation event codes
 * 4. Creates synthetic audit entries for pre-existing recipes and users
 *    (records that existed before audit logging was introduced)
 *
 * Safe to run multiple times — all steps are idempotent.
 *
 * Usage: node backend/scripts/migrate-audit-v2.js
 */

require('dotenv').config();
const pool = require('../src/config/database');

async function run() {
  const client = await pool.connect();
  try {
    console.log('Starting audit_logs migration v2…\n');

    await client.query('BEGIN');

    // ── Step 1: Add new columns ──────────────────────────────────────────────
    await client.query(`
      ALTER TABLE audit_logs
        ADD COLUMN IF NOT EXISTS entity_type VARCHAR(50),
        ADD COLUMN IF NOT EXISTS entity_id   UUID
    `);
    console.log('  ✓ Added entity_type, entity_id columns (no-op if already present)');

    // ── Step 2: Backfill entity_type/entity_id for existing batch rows ───────
    const { rowCount: batchFill } = await client.query(`
      UPDATE audit_logs
         SET entity_type = 'batch',
             entity_id   = batch_id
       WHERE batch_id IS NOT NULL
         AND entity_type IS NULL
    `);
    console.log(`  ✓ Backfilled entity fields on ${batchFill} existing batch audit rows`);

    // ── Step 3: Normalise legacy action strings to dot-notation ──────────────
    const renames = [
      ['batch_created',    'batch.created'],
      ['start',            'batch.started'],
      ['complete',         'batch.completed'],
      ['cancel',           'batch.cancelled'],
      ['step_in_progress', 'batch.step.started'],
      ['step_completed',   'batch.step.completed'],
      ['step_skipped',     'batch.step.skipped'],
      ['step_signed',      'batch.step.signed'],
    ];

    let totalRenamed = 0;
    for (const [oldAction, newAction] of renames) {
      const { rowCount } = await client.query(
        `UPDATE audit_logs SET action = $1 WHERE action = $2`,
        [newAction, oldAction]
      );
      if (rowCount) {
        console.log(`  ✓ Renamed '${oldAction}' → '${newAction}' (${rowCount} rows)`);
        totalRenamed += rowCount;
      }
    }
    if (totalRenamed === 0) {
      console.log('  ✓ No legacy action strings to rename');
    }

    // ── Step 4: Synthetic recipe.created entries for pre-existing recipes ────
    // Only creates entries for recipes that have no audit log entry at all.
    const { rows: recipes } = await client.query(`
      SELECT r.id, r.name, r.product_name, r.version, r.created_by, r.created_at,
             COUNT(rs.id)::int AS step_count
        FROM recipes r
        LEFT JOIN recipe_steps rs ON rs.recipe_id = r.id
       WHERE NOT EXISTS (
         SELECT 1 FROM audit_logs al
          WHERE al.entity_type = 'recipe' AND al.entity_id = r.id
       )
       GROUP BY r.id
    `);

    if (recipes.length === 0) {
      console.log('  ✓ No untracked recipes found');
    } else {
      for (const r of recipes) {
        await client.query(
          `INSERT INTO audit_logs
             (action, entity_type, entity_id, performed_by, details, created_at)
           VALUES ($1, 'recipe', $2, $3, $4, $5)`,
          [
            'recipe.created',
            r.id,
            r.created_by,
            JSON.stringify({
              name: r.name,
              product_name: r.product_name,
              version: r.version,
              step_count: r.step_count,
              note: 'backfilled',
            }),
            r.created_at, // preserve original timestamp
          ]
        );
      }
      console.log(`  ✓ Created recipe.created entries for ${recipes.length} existing recipe(s)`);
    }

    // ── Step 5: Synthetic user.created entries for pre-existing users ─────────
    // Only creates entries for users that have no audit log entry at all.
    const { rows: users } = await client.query(`
      SELECT u.id, u.email, u.full_name, u.role, u.created_at
        FROM users u
       WHERE NOT EXISTS (
         SELECT 1 FROM audit_logs al
          WHERE al.entity_type = 'user' AND al.entity_id = u.id
       )
    `);

    if (users.length === 0) {
      console.log('  ✓ No untracked users found');
    } else {
      for (const u of users) {
        await client.query(
          `INSERT INTO audit_logs
             (action, entity_type, entity_id, performed_by, details, created_at)
           VALUES ($1, 'user', $2, $3, $4, $5)`,
          [
            'user.created',
            u.id,
            'System (seed)',
            JSON.stringify({
              email: u.email,
              role: u.role,
              note: 'backfilled',
            }),
            u.created_at, // preserve original timestamp
          ]
        );
      }
      console.log(`  ✓ Created user.created entries for ${users.length} existing user(s)`);
    }

    // ── Step 6: Synthetic batch.created entries for batches with no audit row ─
    const { rows: batches } = await client.query(`
      SELECT b.id, b.batch_number, b.created_by, b.created_at
        FROM batches b
       WHERE NOT EXISTS (
         SELECT 1 FROM audit_logs al
          WHERE al.batch_id = b.id AND al.action = 'batch.created'
       )
    `);

    if (batches.length === 0) {
      console.log('  ✓ No untracked batches found');
    } else {
      for (const b of batches) {
        await client.query(
          `INSERT INTO audit_logs
             (action, entity_type, entity_id, batch_id, performed_by, details, created_at)
           VALUES ('batch.created', 'batch', $1, $1, $2, $3, $4)`,
          [
            b.id,
            b.created_by,
            JSON.stringify({ batch_number: b.batch_number, note: 'backfilled' }),
            b.created_at,
          ]
        );
      }
      console.log(`  ✓ Created batch.created entries for ${batches.length} existing batch(es)`);
    }

    await client.query('COMMIT');
    console.log('\nMigration complete.');
    console.log('\nNote: Session (login/logout) events can only be captured going forward.');
    console.log('      Log out and log back in to generate your first auth.login entry.\n');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
