import axios from 'axios';
import type {
  Batch, BatchStep, Recipe, AuditLogEntry,
  CreateBatchRequest, UpdateStepRequest, SignStepRequest,
  OpcReading, Equipment, Alarm,
  AuthUser, UserRecord,
} from '../types';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Redirect to /login on 401 (expired or missing session)
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authService = {
  login: (email: string, password: string): Promise<AuthUser> =>
    api.post('/auth/login', { email, password }).then((r) => r.data),

  logout: (): Promise<void> =>
    api.post('/auth/logout').then(() => undefined),

  getMe: (): Promise<AuthUser> =>
    api.get('/auth/me').then((r) => r.data),
};

// ─── Users (admin) ────────────────────────────────────────────────────────────

export const userService = {
  getAllUsers: (): Promise<UserRecord[]> =>
    api.get('/users').then((r) => r.data),

  createUser: (data: { email: string; password: string; full_name: string; role: string }): Promise<UserRecord> =>
    api.post('/users', data).then((r) => r.data),

  updateUser: (id: string, data: Partial<{ full_name: string; role: string; is_active: boolean; password: string }>): Promise<UserRecord> =>
    api.put(`/users/${id}`, data).then((r) => r.data),

  deleteUser: (id: string): Promise<void> =>
    api.delete(`/users/${id}`).then(() => undefined),
};

// ─── Batches ────────────────────────────────────────────────────────────────

export const batchService = {
  getAllBatches: (): Promise<Batch[]> =>
    api.get('/batches').then((r) => r.data),

  getBatch: (id: string): Promise<Batch> =>
    api.get(`/batches/${id}`).then((r) => r.data),

  createBatch: (data: CreateBatchRequest): Promise<Batch> =>
    api.post('/batches', data).then((r) => r.data),

  startBatch: (id: string): Promise<Batch> =>
    api.post(`/batches/${id}/start`).then((r) => r.data),

  completeBatch: (id: string): Promise<Batch> =>
    api.post(`/batches/${id}/complete`).then((r) => r.data),

  cancelBatch: (id: string, reason?: string): Promise<Batch> =>
    api.post(`/batches/${id}/cancel`, { reason }).then((r) => r.data),

  // Steps
  getBatchSteps: (batchId: string): Promise<BatchStep[]> =>
    api.get(`/batches/${batchId}/steps`).then((r) => r.data),

  updateStep: (batchId: string, stepId: string, data: UpdateStepRequest): Promise<BatchStep> =>
    api.put(`/batches/${batchId}/steps/${stepId}`, data).then((r) => r.data),

  signStep: (batchId: string, stepId: string, data: SignStepRequest): Promise<BatchStep> =>
    api.post(`/batches/${batchId}/steps/${stepId}/sign`, data).then((r) => r.data),

  // Audit
  getBatchAuditLog: (batchId: string): Promise<AuditLogEntry[]> =>
    api.get(`/batches/${batchId}/audit`).then((r) => r.data),

  getAllAuditLogs: (limit = 100, offset = 0): Promise<AuditLogEntry[]> =>
    api.get('/batches/audit/all', { params: { limit, offset } }).then((r) => r.data),

  // PDF Report
  generateReport: (batchId: string): Promise<{ success: boolean; reportId: string }> =>
    api.post(`/batches/${batchId}/report`).then((r) => r.data),

  getReportDownloadUrl: (batchId: string): string =>
    `${API_URL}/batches/${batchId}/report/download`,
};

// ─── Recipes ─────────────────────────────────────────────────────────────────

export const recipeService = {
  getAllRecipes: (): Promise<Recipe[]> =>
    api.get('/recipes').then((r) => r.data),

  getRecipe: (id: string): Promise<Recipe> =>
    api.get(`/recipes/${id}`).then((r) => r.data),

  createRecipe: (data: Partial<Recipe> & { steps?: Partial<import('../types').RecipeStep>[] }): Promise<Recipe> =>
    api.post('/recipes', data).then((r) => r.data),

  updateRecipe: (id: string, data: Partial<Recipe>): Promise<Recipe> =>
    api.put(`/recipes/${id}`, data).then((r) => r.data),

  deleteRecipe: (id: string): Promise<void> =>
    api.delete(`/recipes/${id}`).then(() => undefined),
};

// ─── Integrations ────────────────────────────────────────────────────────────

export const integrationService = {
  getStatus: (): Promise<{ connected: boolean; endpoint: string; server: string; timestamp: string }> =>
    api.get('/integrations/status').then((r) => r.data),

  getReadings: (): Promise<{ readings: Record<string, OpcReading>; timestamp: string }> =>
    api.get('/integrations/readings').then((r) => r.data),

  getEquipment: (): Promise<{ equipment: Equipment[]; timestamp: string }> =>
    api.get('/integrations/equipment').then((r) => r.data),

  getAlarms: (): Promise<{ alarms: Alarm[]; timestamp: string }> =>
    api.get('/integrations/alarms').then((r) => r.data),
};

export default api;
