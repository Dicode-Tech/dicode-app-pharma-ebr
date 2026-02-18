import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { batchService } from '../services/api';
import type { Batch, BatchStep } from '../types';
import { ArrowLeft, Play, CheckCircle, XCircle, User, Calendar } from 'lucide-react';

export function BatchDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [batch, setBatch] = useState<Batch | null>(null);
  const [steps, setSteps] = useState<BatchStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      loadBatch(id);
      loadSteps(id);
    }
  }, [id]);

  const loadBatch = async (batchId: string) => {
    try {
      const data = await batchService.getBatch(batchId);
      setBatch(data);
    } catch (err) {
      setError('Failed to load batch');
    }
  };

  const loadSteps = async (batchId: string) => {
    try {
      const data = await batchService.getBatchSteps(batchId);
      setSteps(data);
    } catch (err) {
      console.error('Failed to load steps');
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async () => {
    if (!id) return;
    try {
      await batchService.startBatch(id, 'current-user');
      loadBatch(id);
    } catch (err) {
      alert('Failed to start batch');
    }
  };

  const handleComplete = async () => {
    if (!id) return;
    try {
      await batchService.completeBatch(id, 'current-user');
      loadBatch(id);
    } catch (err) {
      alert('Failed to complete batch');
    }
  };

  const handleCancel = async () => {
    if (!id) return;
    if (!confirm('Are you sure you want to cancel this batch?')) return;
    try {
      await batchService.cancelBatch(id, 'current-user');
      loadBatch(id);
    } catch (err) {
      alert('Failed to cancel batch');
    }
  };

  const getStatusVariant = (status: Batch['status']) => {
    switch (status) {
      case 'active':
        return 'info';
      case 'completed':
        return 'success';
      case 'cancelled':
        return 'danger';
      default:
        return 'default';
    }
  };

  const getStepStatusVariant = (status: BatchStep['status']) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'in_progress':
        return 'info';
      case 'skipped':
        return 'warning';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">Loading...</div>
        </div>
      </Layout>
    );
  }

  if (error || !batch) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-red-500 mb-4">{error || 'Batch not found'}</p>
          <Button onClick={() => navigate('/batches')}>Back to Batches</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={() => navigate('/batches')}
              className="mr-4 text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Batch {batch.batch_number}
              </h2>
              <p className="text-gray-500">{batch.product_name}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {batch.status === 'draft' && (
              <Button onClick={handleStart} variant="outline">
                <Play className="w-4 h-4 mr-2" />
                Start Batch
              </Button>
            )}
            {batch.status === 'active' && (
              <Button onClick={handleComplete}>
                <CheckCircle className="w-4 h-4 mr-2" />
                Complete
              </Button>
            )}
            {(batch.status === 'draft' || batch.status === 'active') && (
              <Button onClick={handleCancel} variant="danger">
                <XCircle className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            )}
          </div>
        </div>

        {/* Batch Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <p className="text-sm text-gray-500">Status</p>
            <Badge variant={getStatusVariant(batch.status)} className="mt-1">
              {batch.status}
            </Badge>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <p className="text-sm text-gray-500">Batch Size</p>
            <p className="text-lg font-semibold">{batch.batch_size.toLocaleString()} units</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <p className="text-sm text-gray-500">Created By</p>
            <p className="text-lg font-semibold">{batch.created_by}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <p className="text-sm text-gray-500">Created</p>
            <p className="text-lg font-semibold">
              {new Date(batch.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Steps */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Production Steps</h3>
          </div>
          
          {steps.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No steps defined for this batch
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {steps.map((step) => (
                <div key={step.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-600">
                          {step.step_number}
                        </span>
                        <h4 className="text-lg font-medium text-gray-900">
                          {step.description}
                        </h4>
                      </div>
                      
                      <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
                        <Badge variant={getStepStatusVariant(step.status)}>
                          {step.status}
                        </Badge>
                        {step.performed_by && (
                          <span className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            {step.performed_by}
                          </span>
                        )}
                        {step.completed_at && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(step.completed_at).toLocaleString()}
                          </span>
                        )}
                      </div>

                      {step.notes && (
                        <p className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                          {step.notes}
                        </p>
                      )}
                    </div>

                    <div className="ml-4">
                      {step.status === 'pending' && batch.status === 'active' && (
                        <Button size="sm">
                          <Play className="w-4 h-4 mr-1" />
                          Start
                        </Button>
                      )}
                      {step.status === 'in_progress' && (
                        <Button size="sm">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Complete
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
