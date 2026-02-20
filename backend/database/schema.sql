-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Recipes table
CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  version VARCHAR(50) NOT NULL DEFAULT '1.0',
  description TEXT,
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Recipe steps table
CREATE TABLE IF NOT EXISTS recipe_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Batches table
CREATE TABLE IF NOT EXISTS batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number VARCHAR(100) NOT NULL UNIQUE,
  product_name VARCHAR(255) NOT NULL,
  batch_size NUMERIC(12, 3) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  recipe_id UUID REFERENCES recipes(id),
  created_by VARCHAR(255) NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Batch steps table
CREATE TABLE IF NOT EXISTS batch_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES batches(id),
  step_id UUID REFERENCES batch_steps(id),
  action VARCHAR(100) NOT NULL,
  performed_by VARCHAR(255),
  details JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- PDF reports table
CREATE TABLE IF NOT EXISTS pdf_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  file_path VARCHAR(500) NOT NULL,
  generated_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin','batch_manager','operator_supervisor','operator','qa_qc')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_batches_status ON batches(status);
CREATE INDEX IF NOT EXISTS idx_batches_created_at ON batches(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_batch_steps_batch_id ON batch_steps(batch_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_batch_id ON audit_logs(batch_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_step_id ON audit_logs(step_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pdf_reports_batch_id ON pdf_reports(batch_id);
