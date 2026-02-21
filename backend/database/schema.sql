-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS timescaledb;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─────────────────────────────────────────────────────────────────────────────
--  Multi-tenant core tables
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tenant_settings (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  branding JSONB NOT NULL DEFAULT '{}',
  feature_flags JSONB NOT NULL DEFAULT '{}',
  compliance JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
--  Recipes & steps
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  version VARCHAR(50) NOT NULL DEFAULT '1.0',
  description TEXT,
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recipe_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  description VARCHAR(500) NOT NULL,
  instructions TEXT,
  step_type VARCHAR(50) NOT NULL DEFAULT 'manual'
    CHECK (step_type IN ('manual', 'measurement', 'verification', 'equipment_check')),
  expected_value NUMERIC(12, 3),
  unit VARCHAR(50),
  requires_signature BOOLEAN NOT NULL DEFAULT false,
  duration_minutes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(recipe_id, step_number)
);

-- ─────────────────────────────────────────────────────────────────────────────
--  Batches & steps
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  batch_number VARCHAR(100) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  batch_size NUMERIC(12, 3) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  recipe_id UUID REFERENCES recipes(id),
  created_by VARCHAR(255) NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, batch_number)
);

CREATE TABLE IF NOT EXISTS batch_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  description VARCHAR(500) NOT NULL,
  instructions TEXT,
  step_type VARCHAR(50) NOT NULL DEFAULT 'manual'
    CHECK (step_type IN ('manual', 'measurement', 'verification', 'equipment_check')),
  expected_value NUMERIC(12, 3),
  actual_value NUMERIC(12, 3),
  unit VARCHAR(50),
  requires_signature BOOLEAN NOT NULL DEFAULT false,
  signature_data TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
  performed_by VARCHAR(255),
  notes TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(batch_id, step_number)
);

-- ─────────────────────────────────────────────────────────────────────────────
--  Audit trail & reports
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entity_type VARCHAR(50),
  entity_id   UUID,
  batch_id UUID REFERENCES batches(id),
  step_id UUID REFERENCES batch_steps(id),
  action VARCHAR(100) NOT NULL,
  performed_by VARCHAR(255),
  details JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pdf_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  file_path VARCHAR(500) NOT NULL,
  generated_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
--  Users
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin','batch_manager','operator_supervisor','operator','qa_qc')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, email)
);

-- ─────────────────────────────────────────────────────────────────────────────
--  Legacy compatibility: ensure columns exist when upgrading from older schema
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS recipes ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE IF EXISTS recipe_steps ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE IF EXISTS batches ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE IF EXISTS batch_steps ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE IF EXISTS audit_logs ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE IF EXISTS pdf_reports ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS tenant_id UUID;

ALTER TABLE IF EXISTS batches DROP CONSTRAINT IF EXISTS batches_batch_number_key;
ALTER TABLE IF EXISTS users DROP CONSTRAINT IF EXISTS users_email_key;

ALTER TABLE IF EXISTS batches ADD CONSTRAINT IF NOT EXISTS batches_batch_number_tenant_key UNIQUE (tenant_id, batch_number);
ALTER TABLE IF EXISTS users ADD CONSTRAINT IF NOT EXISTS users_tenant_email_key UNIQUE (tenant_id, email);

-- Foreign keys for upgraded schemas (no-op if already present)
ALTER TABLE IF EXISTS recipes ADD CONSTRAINT IF NOT EXISTS recipes_tenant_fk FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS recipe_steps ADD CONSTRAINT IF NOT EXISTS recipe_steps_tenant_fk FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS batches ADD CONSTRAINT IF NOT EXISTS batches_tenant_fk FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS batch_steps ADD CONSTRAINT IF NOT EXISTS batch_steps_tenant_fk FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS audit_logs ADD CONSTRAINT IF NOT EXISTS audit_logs_tenant_fk FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS pdf_reports ADD CONSTRAINT IF NOT EXISTS pdf_reports_tenant_fk FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS users ADD CONSTRAINT IF NOT EXISTS users_tenant_fk FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_recipes_tenant_id ON recipes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_recipe_steps_tenant_id ON recipe_steps(tenant_id);
CREATE INDEX IF NOT EXISTS idx_batches_tenant_id ON batches(tenant_id);
CREATE INDEX IF NOT EXISTS idx_batch_steps_tenant_id ON batch_steps(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pdf_reports_tenant_id ON pdf_reports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);

CREATE INDEX IF NOT EXISTS idx_batches_status ON batches(status);
CREATE INDEX IF NOT EXISTS idx_batches_created_at ON batches(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_batch_steps_batch_id ON batch_steps(batch_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_batch_id ON audit_logs(batch_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_step_id ON audit_logs(step_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pdf_reports_batch_id ON pdf_reports(batch_id);

-- ─────────────────────────────────────────────────────────────────────────────
--  Backfill tenant_id for legacy data & ensure NOT NULL
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  default_tenant_id UUID;
BEGIN
  INSERT INTO tenants (slug, name)
  VALUES ('demo', 'Dicode Demo Labs')
  ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()
  RETURNING id INTO default_tenant_id;

  IF default_tenant_id IS NULL THEN
    SELECT id INTO default_tenant_id FROM tenants WHERE slug = 'demo';
  END IF;

  INSERT INTO tenant_settings (tenant_id, branding, feature_flags)
  VALUES (
    default_tenant_id,
    '{"primaryColor":"#1d4ed8","primaryDarkColor":"#1e3a8a","primarySoftColor":"#dbeafe","badgeBackground":"#dcfce7","badgeText":"#047857","logoText":"Dicode EBR"}',
    '{"planningModuleEnabled":false}'
  )
  ON CONFLICT (tenant_id) DO NOTHING;

  UPDATE users SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
  UPDATE recipes SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
  UPDATE recipe_steps SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
  UPDATE batches SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
  UPDATE batch_steps SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
  UPDATE audit_logs SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
  UPDATE pdf_reports SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
END$$;

ALTER TABLE recipes ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE recipe_steps ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE batches ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE batch_steps ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE audit_logs ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE pdf_reports ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE users ALTER COLUMN tenant_id SET NOT NULL;
