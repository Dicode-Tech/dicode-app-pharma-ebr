export interface TenantInfo {
  id: string;
  slug: string;
  name: string;
}

export interface TenantBranding {
  primaryColor?: string;
  primaryDarkColor?: string;
  primarySoftColor?: string;
  badgeBackground?: string;
  badgeText?: string;
  logoText?: string;
  logoUrl?: string;
}

export interface TenantSettings {
  tenant: TenantInfo;
  branding: TenantBranding;
  feature_flags: Record<string, boolean>;
  compliance?: Record<string, unknown>;
}

export interface Batch {
  id: string;
  batch_number: string;
  product_name: string;
  batch_size: number;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  recipe_id?: string;
  created_by: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  total_steps?: number;
  completed_steps?: number;
}

export interface BatchStep {
  id: string;
  batch_id: string;
  step_number: number;
  description: string;
  instructions?: string;
  step_type: 'manual' | 'measurement' | 'verification' | 'equipment_check';
  expected_value?: number;
  actual_value?: number;
  unit?: string;
  requires_signature: boolean;
  signature_data?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  performed_by?: string;
  started_at?: string;
  completed_at?: string;
  notes?: string;
}

export interface Recipe {
  id: string;
  name: string;
  product_name: string;
  version: string;
  description?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  steps?: RecipeStep[];
}

export interface RecipeStep {
  id: string;
  recipe_id: string;
  step_number: number;
  description: string;
  instructions?: string;
  step_type: 'manual' | 'measurement' | 'verification' | 'equipment_check';
  expected_value?: number;
  unit?: string;
  requires_signature: boolean;
  duration_minutes?: number;
}

export type AuditEntityType = 'batch' | 'recipe' | 'user' | 'session';

export interface AuditLogEntry {
  id: string;
  entity_type?: AuditEntityType;
  entity_id?: string;
  entity_name?: string;   // enriched by backend: batch_number, recipe name, user full_name, etc.
  batch_id?: string;
  batch_number?: string;
  step_id?: string;
  step_number?: number;
  step_description?: string;
  action: string;
  performed_by?: string;
  details?: Record<string, unknown>;
  ip_address?: string;
  created_at: string;
}

export interface CreateBatchRequest {
  batch_number: string;
  product_name: string;
  batch_size: number;
  created_by: string;
  recipe_id?: string;
}

export interface UpdateStepRequest {
  status: BatchStep['status'];
  performed_by: string;
  notes?: string;
  actual_value?: number;
}

export interface SignStepRequest {
  performed_by: string;
  signature_data: string;
  notes?: string;
  actual_value?: number;
}

export interface OpcReading {
  tag: string;
  description: string;
  value: number;
  unit: string;
  setpoint: number;
  tolerance: number;
  timestamp: string;
}

export interface Equipment {
  id: string;
  name: string;
  type: string;
  status: 'running' | 'idle' | 'maintenance' | 'fault';
  calibration_due: string;
  last_cleaned: string;
  operator?: string | null;
}

export interface Alarm {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  tag: string;
  message: string;
  acknowledged: boolean;
  timestamp: string;
}

export type UserRole = 'admin' | 'batch_manager' | 'operator_supervisor' | 'operator' | 'qa_qc';

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  tenant: TenantInfo;
}

export interface UserRecord {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}
