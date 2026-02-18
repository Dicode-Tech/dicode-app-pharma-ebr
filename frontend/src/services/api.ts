import axios from 'axios';
import type { Batch, BatchStep, CreateBatchRequest, UpdateStepRequest } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const batchService = {
  // Batches
  getAllBatches: async (): Promise<Batch[]> => {
    const response = await api.get('/batches');
    return response.data;
  },

  getBatch: async (id: string): Promise<Batch> => {
    const response = await api.get(`/batches/${id}`);
    return response.data;
  },

  createBatch: async (data: CreateBatchRequest): Promise<Batch> => {
    const response = await api.post('/batches', data);
    return response.data;
  },

  startBatch: async (id: string, performedBy: string): Promise<Batch> => {
    const response = await api.post(`/batches/${id}/start`, { performed_by: performedBy });
    return response.data;
  },

  completeBatch: async (id: string, performedBy: string): Promise<Batch> => {
    const response = await api.post(`/batches/${id}/complete`, { performed_by: performedBy });
    return response.data;
  },

  cancelBatch: async (id: string, performedBy: string): Promise<Batch> => {
    const response = await api.post(`/batches/${id}/cancel`, { performed_by: performedBy });
    return response.data;
  },

  // Steps
  getBatchSteps: async (batchId: string): Promise<BatchStep[]> => {
    const response = await api.get(`/batches/${batchId}/steps`);
    return response.data;
  },

  updateStep: async (batchId: string, stepId: string, data: UpdateStepRequest): Promise<BatchStep> => {
    const response = await api.put(`/batches/${batchId}/steps/${stepId}`, data);
    return response.data;
  },
};

export default api;
