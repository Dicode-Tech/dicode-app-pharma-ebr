export interface Batch {
  id: string;
  batch_number: string;
  product_name: string;
  batch_size: number;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  created_by: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface BatchStep {
  id: string;
  batch_id: string;
  step_number: number;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  performed_by?: string;
  started_at?: string;
  completed_at?: string;
  notes?: string;
}

export interface CreateBatchRequest {
  batch_number: string;
  product_name: string;
  batch_size: number;
  created_by: string;
}

export interface UpdateStepRequest {
  status: BatchStep['status'];
  performed_by: string;
  notes?: string;
}
