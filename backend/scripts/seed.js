require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../src/config/database');

const DEMO_TENANT = {
  slug: 'demo',
  name: 'Dicode Demo Labs',
  branding: {
    primaryColor: '#1d4ed8',
    primaryDarkColor: '#1e3a8a',
    primarySoftColor: '#dbeafe',
    badgeBackground: '#dcfce7',
    badgeText: '#047857',
    logoText: 'Dicode EBR'
  },
  featureFlags: {
    planningModuleEnabled: false
  }
};

const RECIPES = [
  {
    name: 'Paracetamol 500mg Tablet',
    product_name: 'Paracetamol 500mg',
    version: '3.2',
    description: 'Standard manufacturing procedure for Paracetamol 500mg film-coated tablets. GMP compliant batch size 500kg.',
    created_by: 'Dr. A. Rossi',
    steps: [
      { step_number: 1, description: 'Weigh Raw Materials', step_type: 'measurement', expected_value: 500, unit: 'kg', requires_signature: true, duration_minutes: 45, instructions: 'Weigh Paracetamol API, microcrystalline cellulose, and excipients on calibrated scales. Verify each material against CoA certificate. Record actual weights on weighing sheet.' },
      { step_number: 2, description: 'Pre-blending Verification', step_type: 'verification', requires_signature: true, duration_minutes: 15, instructions: 'Verify blender cleanliness log. Confirm equipment calibration is valid (label must not be expired). Start blender pre-check sequence.' },
      { step_number: 3, description: 'Granulation – Water Addition', step_type: 'measurement', expected_value: 85, unit: 'L', requires_signature: false, duration_minutes: 30, instructions: 'Add purified water slowly to the high-shear granulator at 15 L/min. Monitor granule endpoint using power consumption curve. Target moisture content 3–4%.' },
      { step_number: 4, description: 'Fluid Bed Drying', step_type: 'measurement', expected_value: 65, unit: '°C', requires_signature: true, duration_minutes: 90, instructions: 'Transfer wet granules to fluid bed dryer. Set inlet air temperature to 65°C. Monitor outlet temperature and LOD (Loss on Drying). Stop drying when LOD ≤ 2.0%.' },
      { step_number: 5, description: 'Milling & Sieving', step_type: 'equipment_check', requires_signature: false, duration_minutes: 20, instructions: 'Pass dried granules through co-mill set to 1.0mm screen. Collect and weigh milled granules. Record yield. Reject any granules exceeding particle size specification.' },
      { step_number: 6, description: 'Tablet Compression', step_type: 'measurement', expected_value: 500, unit: 'mg', requires_signature: true, duration_minutes: 120, instructions: 'Set up Fette 3090 tablet press with 10mm round punches. Target tablet weight 500mg ± 15mg. Check hardness (80–120N), friability (< 0.5%), and disintegration (< 15 min) every 30 minutes.' },
      { step_number: 7, description: 'Coating Application', step_type: 'measurement', expected_value: 3.5, unit: '% weight gain', requires_signature: false, duration_minutes: 150, instructions: 'Load tablets into coating pan. Apply Opadry II coating suspension. Target weight gain 3.5% ± 0.5%. Monitor pan temperature and spray rate. Sample every 30 minutes for visual inspection.' },
      { step_number: 8, description: 'Final QC Release Check', step_type: 'verification', requires_signature: true, duration_minutes: 60, instructions: 'Perform IPC tests: Appearance, Assay (95–105%), Dissolution (≥ 80% Q at 45 min), Uniformity of Mass. Compare results against specifications. QC Manager sign-off required before release.' },
    ],
  },
  {
    name: 'Amoxicillin 250mg Capsule',
    product_name: 'Amoxicillin 250mg',
    version: '2.1',
    description: 'Manufacturing procedure for Amoxicillin trihydrate 250mg hard gelatin capsules. Batch size 200kg.',
    created_by: 'Dr. M. Ferrara',
    steps: [
      { step_number: 1, description: 'API Dispensing & Sampling', step_type: 'measurement', expected_value: 200, unit: 'kg', requires_signature: true, duration_minutes: 30, instructions: 'Dispense Amoxicillin trihydrate from quarantine. Take 50g sample for identity testing. Confirm HPLC identity result before proceeding. Store API in climate-controlled dispensary at 15–25°C.' },
      { step_number: 2, description: 'Blending', step_type: 'manual', requires_signature: false, duration_minutes: 20, instructions: 'Charge API and excipients into bin blender. Blend for 10 minutes at 12 rpm. Take blend uniformity samples from top, middle and bottom of bin. Acceptance criteria: RSD < 5%.' },
      { step_number: 3, description: 'Blend Uniformity Testing', step_type: 'verification', requires_signature: true, duration_minutes: 40, instructions: 'Analyze 9 blend samples by UV spectrophotometry. Calculate mean, SD and RSD. If RSD > 5%, blend an additional 5 minutes and retest. Attach chromatograms to batch record.' },
      { step_number: 4, description: 'Capsule Filling', step_type: 'measurement', expected_value: 300, unit: 'mg', requires_signature: true, duration_minutes: 180, instructions: 'Set up Bosch GKF capsule filling machine with size #1 capsules. Target fill weight 300mg (250mg API + 50mg excipients) ± 7.5mg. Check 20 capsules per hour for weight variation. Discard out-of-specification capsules.' },
      { step_number: 5, description: 'Polishing & Inspection', step_type: 'equipment_check', requires_signature: false, duration_minutes: 30, instructions: 'Polish capsules in polishing drum for 5 minutes. 100% visual inspection under 1500 lux light. Reject: dented, cracked, or incompletely filled capsules. Record rejection rate (acceptance: < 0.1%).' },
      { step_number: 6, description: 'Packaging & Labelling', step_type: 'verification', requires_signature: true, duration_minutes: 60, instructions: 'Pack approved capsules into HDPE bottles (30 count). Apply batch-specific labels with lot number, expiry date, and QR code. Reconcile label accountability (issued vs used vs destroyed). QA release approval required.' },
    ],
  },
];

async function ensureDemoTenant(client) {
  const { rows } = await client.query(
    `INSERT INTO tenants (slug, name)
     VALUES ($1, $2)
     ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()
     RETURNING id`,
    [DEMO_TENANT.slug, DEMO_TENANT.name]
  );
  const tenantId = rows[0]?.id || (await client.query('SELECT id FROM tenants WHERE slug = $1', [DEMO_TENANT.slug])).rows[0].id;

  await client.query(
    `INSERT INTO tenant_settings (tenant_id, branding, feature_flags)
     VALUES ($1, $2::jsonb, $3::jsonb)
     ON CONFLICT (tenant_id) DO UPDATE
       SET branding = EXCLUDED.branding,
           feature_flags = EXCLUDED.feature_flags,
           updated_at = NOW()`,
    [tenantId, JSON.stringify(DEMO_TENANT.branding), JSON.stringify(DEMO_TENANT.featureFlags)]
  );

  return tenantId;
}

async function seedUsers(client, tenantId) {
  const USERS = [
    { email: 'admin@ebr.local', full_name: 'Admin User', role: 'admin' },
    { email: 'manager@ebr.local', full_name: 'Batch Manager', role: 'batch_manager' },
    { email: 'supervisor@ebr.local', full_name: 'Operator Supervisor', role: 'operator_supervisor' },
    { email: 'operator@ebr.local', full_name: 'Operator', role: 'operator' },
    { email: 'qa@ebr.local', full_name: 'QA Officer', role: 'qa_qc' },
  ];
  const password_hash = await bcrypt.hash('Password1!', 10);
  for (const u of USERS) {
    await client.query(
      `INSERT INTO users (tenant_id, email, password_hash, full_name, role)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (tenant_id, email) DO NOTHING`,
      [tenantId, u.email, password_hash, u.full_name, u.role]
    );
    console.log(`  ✓ User: ${u.full_name} (${u.role}) — ${u.email}`);
  }
}

async function seedRecipes(client, tenantId) {
  const recipeIds = [];
  for (const recipe of RECIPES) {
    const { rows } = await client.query(
      `INSERT INTO recipes (tenant_id, name, product_name, version, description, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [tenantId, recipe.name, recipe.product_name, recipe.version, recipe.description, recipe.created_by]
    );
    const recipeId = rows[0].id;
    recipeIds.push(recipeId);

    for (const step of recipe.steps) {
      await client.query(
        `INSERT INTO recipe_steps (tenant_id, recipe_id, step_number, description, step_type, expected_value, unit, requires_signature, duration_minutes, instructions)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)` ,
        [tenantId, recipeId, step.step_number, step.description, step.step_type, step.expected_value || null, step.unit || null, step.requires_signature, step.duration_minutes || null, step.instructions]
      );
    }
    console.log(`  ✓ Recipe: ${recipe.name} (${recipe.steps.length} steps)`);
  }
  return recipeIds;
}

async function seedBatches(client, tenantId, recipeIds) {
  const now = new Date();
  const d = (days) => new Date(now - days * 86400000);

  const BATCHES = [
    {
      batch_number: 'B2026-001',
      product_name: 'Paracetamol 500mg',
      batch_size: 500,
      status: 'completed',
      recipe_id: recipeIds[0],
      created_by: 'Dr. A. Rossi',
      started_at: d(5),
      completed_at: d(4),
      steps: [
        { step_number: 1, status: 'completed', performed_by: 'M. Bianchi', actual_value: 499.8, notes: 'All materials verified against CoA. Slight underweight compensated.', started_at: d(5), completed_at: d(4.9) },
        { step_number: 2, status: 'completed', performed_by: 'M. Bianchi', notes: 'Blender cleaned and calibrated. All checks passed.', started_at: d(4.9), completed_at: d(4.85) },
        { step_number: 3, status: 'completed', performed_by: 'S. Conti', actual_value: 85.2, notes: 'Water addition complete. Granule endpoint reached at expected power consumption.', started_at: d(4.85), completed_at: d(4.75) },
        { step_number: 4, status: 'completed', performed_by: 'S. Conti', actual_value: 64.8, notes: 'LOD reached 1.8% after 85 minutes. Within specification.', started_at: d(4.75), completed_at: d(4.5) },
        { step_number: 5, status: 'completed', performed_by: 'R. Marini', notes: 'Milling complete. Yield: 97.2%. All granules within PSD specification.', started_at: d(4.5), completed_at: d(4.4) },
        { step_number: 6, status: 'completed', performed_by: 'R. Marini', actual_value: 502.1, notes: 'Tablet weight 502.1mg avg. Hardness 95N. Friability 0.3%. Disintegration 11 min.', started_at: d(4.4), completed_at: d(4.1) },
        { step_number: 7, status: 'completed', performed_by: 'L. Ferrari', actual_value: 3.6, notes: 'Weight gain 3.6%. Appearance: white, smooth, film coated. No defects noted.', started_at: d(4.1), completed_at: d(3.9) },
        { step_number: 8, status: 'completed', performed_by: 'Dr. A. Rossi', notes: 'All IPC results within specification. Batch released for packaging.', started_at: d(3.9), completed_at: d(3.8) },
      ],
    },
    {
      batch_number: 'B2026-002',
      product_name: 'Amoxicillin 250mg',
      batch_size: 200,
      status: 'completed',
      recipe_id: recipeIds[1],
      created_by: 'Dr. M. Ferrara',
      started_at: d(3),
      completed_at: d(2),
      steps: [
        { step_number: 1, status: 'completed', performed_by: 'C. Greco', actual_value: 200.1, notes: 'Identity confirmed by HPLC. CoA verified.', started_at: d(3), completed_at: d(2.9) },
        { step_number: 2, status: 'completed', performed_by: 'C. Greco', notes: 'Blending complete. Blend uniformity samples collected.', started_at: d(2.9), completed_at: d(2.8) },
        { step_number: 3, status: 'completed', performed_by: 'F. Bruno', notes: 'RSD = 2.3%. Within acceptance criteria. Chromatograms attached.', started_at: d(2.8), completed_at: d(2.65) },
        { step_number: 4, status: 'completed', performed_by: 'F. Bruno', actual_value: 301.2, notes: 'Fill weight 301.2mg avg. Rejection rate 0.02%.', started_at: d(2.65), completed_at: d(2.3) },
        { step_number: 5, status: 'completed', performed_by: 'G. Ricci', notes: 'Polishing complete. Visual inspection passed. Rejection rate 0.05%.', started_at: d(2.3), completed_at: d(2.2) },
        { step_number: 6, status: 'completed', performed_by: 'Dr. M. Ferrara', notes: 'Label reconciliation complete. Batch released.', started_at: d(2.2), completed_at: d(2.1) },
      ],
    },
    {
      batch_number: 'B2026-003',
      product_name: 'Paracetamol 500mg',
      batch_size: 500,
      status: 'active',
      recipe_id: recipeIds[0],
      created_by: 'Dr. A. Rossi',
      started_at: d(1),
      steps: [
        { step_number: 1, status: 'completed', performed_by: 'M. Bianchi', actual_value: 500.3, notes: 'All materials verified.', started_at: d(1), completed_at: d(0.9) },
        { step_number: 2, status: 'completed', performed_by: 'M. Bianchi', notes: 'Equipment checks passed.', started_at: d(0.9), completed_at: d(0.85) },
        { step_number: 3, status: 'in_progress', performed_by: 'S. Conti', actual_value: null, notes: null, started_at: d(0.1), completed_at: null },
        { step_number: 4, status: 'pending' },
        { step_number: 5, status: 'pending' },
        { step_number: 6, status: 'pending' },
        { step_number: 7, status: 'pending' },
        { step_number: 8, status: 'pending' },
      ],
    },
    {
      batch_number: 'B2026-004',
      product_name: 'Amoxicillin 250mg',
      batch_size: 200,
      status: 'draft',
      recipe_id: recipeIds[1],
      created_by: 'Dr. M. Ferrara',
      steps: [
        { step_number: 1, status: 'pending' },
        { step_number: 2, status: 'pending' },
        { step_number: 3, status: 'pending' },
        { step_number: 4, status: 'pending' },
        { step_number: 5, status: 'pending' },
        { step_number: 6, status: 'pending' },
      ],
    },
    {
      batch_number: 'B2026-000',
      product_name: 'Paracetamol 500mg',
      batch_size: 250,
      status: 'cancelled',
      recipe_id: recipeIds[0],
      created_by: 'Dr. A. Rossi',
      started_at: d(10),
      steps: [
        { step_number: 1, status: 'completed', performed_by: 'M. Bianchi', actual_value: 249.5, notes: 'Materials weighed.', started_at: d(10), completed_at: d(9.9) },
        { step_number: 2, status: 'skipped', notes: 'Batch cancelled due to API CoA failure.', started_at: null, completed_at: null },
        { step_number: 3, status: 'pending' },
        { step_number: 4, status: 'pending' },
        { step_number: 5, status: 'pending' },
        { step_number: 6, status: 'pending' },
        { step_number: 7, status: 'pending' },
        { step_number: 8, status: 'pending' },
      ],
    },
  ];

  for (const batch of BATCHES) {
    const { rows } = await client.query(
      `INSERT INTO batches (tenant_id, batch_number, product_name, batch_size, status, recipe_id, created_by, started_at, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [tenantId, batch.batch_number, batch.product_name, batch.batch_size, batch.status, batch.recipe_id, batch.created_by, batch.started_at || null, batch.completed_at || null]
    );
    const batchId = rows[0].id;

    const { rows: recipeSteps } = await client.query(
      'SELECT * FROM recipe_steps WHERE recipe_id = $1 AND tenant_id = $2 ORDER BY step_number',
      [batch.recipe_id, tenantId]
    );

    for (const step of batch.steps) {
      const recipeStep = recipeSteps[step.step_number - 1];
      await client.query(
        `INSERT INTO batch_steps (tenant_id, batch_id, step_number, description, instructions, step_type, expected_value, unit, requires_signature, actual_value, status, performed_by, notes, started_at, completed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)` ,
        [
          tenantId,
          batchId,
          step.step_number,
          recipeStep.description,
          recipeStep.instructions,
          recipeStep.step_type,
          recipeStep.expected_value,
          recipeStep.unit,
          recipeStep.requires_signature,
          step.actual_value || null,
          step.status,
          step.performed_by || null,
          step.notes || null,
          step.started_at || null,
          step.completed_at || null,
        ]
      );
    }

    const auditEntries = [];
    if (batch.status !== 'draft') {
      auditEntries.push({ action: 'batch_created', details: { batch_number: batch.batch_number } });
    }
    if (batch.started_at) {
      auditEntries.push({ action: 'start', details: { batch_number: batch.batch_number } });
    }
    if (batch.completed_at) {
      auditEntries.push({ action: 'complete', details: { batch_number: batch.batch_number } });
    }
    if (batch.status === 'cancelled') {
      auditEntries.push({ action: 'cancel', details: { reason: 'API CoA failure — batch void' } });
    }

    for (const entry of auditEntries) {
      await client.query(
        `INSERT INTO audit_logs (tenant_id, batch_id, action, performed_by, details)
         VALUES ($1, $2, $3, $4, $5)` ,
        [tenantId, batchId, entry.action, batch.created_by, JSON.stringify(entry.details)]
      );
    }

    console.log(`  ✓ Batch: ${batch.batch_number} [${batch.status}] — ${batch.steps.length} steps`);
  }
}

async function seed() {
  const client = await pool.connect();
  try {
    console.log('Seeding database...\n');

    await client.query('BEGIN');

    const tenantId = await ensureDemoTenant(client);

    await client.query('DELETE FROM audit_logs WHERE tenant_id = $1', [tenantId]);
    await client.query('DELETE FROM pdf_reports WHERE tenant_id = $1', [tenantId]);
    await client.query('DELETE FROM batch_steps WHERE tenant_id = $1', [tenantId]);
    await client.query('DELETE FROM batches WHERE tenant_id = $1', [tenantId]);
    await client.query('DELETE FROM recipe_steps WHERE tenant_id = $1', [tenantId]);
    await client.query('DELETE FROM recipes WHERE tenant_id = $1', [tenantId]);
    await client.query('DELETE FROM users WHERE tenant_id = $1', [tenantId]);

    console.log('Seeding users...');
    await seedUsers(client, tenantId);

    console.log('\nSeeding recipes...');
    const recipeIds = await seedRecipes(client, tenantId);

    console.log('\nSeeding batches...');
    await seedBatches(client, tenantId, recipeIds);

    await client.query('COMMIT');
    console.log('\nSeed completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
