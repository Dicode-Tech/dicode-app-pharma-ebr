import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { StepCard } from '../components/StepCard';
import { batchService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { Batch, BatchStep } from '../types';
import {
  ArrowLeft, Play, CheckCircle, XCircle,
  FileDown, Loader2, ShieldCheck, ClipboardList,
} from 'lucide-react';

export function BatchDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [batch, setBatch] = useState<Batch | null>(null);
  const [steps, setSteps] = useState<BatchStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [pdfReady, setPdfReady] = useState(false);

  useEffect(() => {
    if (id) loadAll(id);
  }, [id]);

  async function loadAll(batchId: string) {
    try {
      const [batchData, stepsData] = await Promise.all([
        batchService.getBatch(batchId),
        batchService.getBatchSteps(batchId),
      ]);
      setBatch(batchData);
      setSteps(stepsData);
    } catch {
      setError('Failed to load batch');
    } finally {
      setLoading(false);
    }
  }

  async function handleStart() {
    if (!id) return;
    try { await batchService.startBatch(id); loadAll(id); }
    catch { alert('Failed to start batch'); }
  }

  async function handleComplete() {
    if (!id) return;
    const pending = steps.filter(s => s.status === 'pending' || s.status === 'in_progress').length;
    if (pending > 0 && !confirm(`${pending} step(s) not yet completed. Complete batch anyway?`)) return;
    try { await batchService.completeBatch(id); loadAll(id); }
    catch { alert('Failed to complete batch'); }
  }

  async function handleCancel() {
    if (!id) return;
    if (!confirm('Cancel this batch? This cannot be undone.')) return;
    try { await batchService.cancelBatch(id, 'Cancelled by operator'); loadAll(id); }
    catch { alert('Failed to cancel batch'); }
  }

  async function handleStepStart(stepId: string) {
    if (!id) return;
    const updated = await batchService.updateStep(id, stepId, {
      status: 'in_progress',
      performed_by: user?.full_name ?? '',
    });
    setSteps(prev => prev.map(s => s.id === stepId ? updated : s));
  }

  async function handleStepComplete(stepId: string, data: { notes?: string; actual_value?: number }) {
    if (!id) return;
    const updated = await batchService.updateStep(id, stepId, {
      status: 'completed',
      performed_by: user?.full_name ?? '',
      ...data,
    });
    setSteps(prev => prev.map(s => s.id === stepId ? updated : s));
  }

  async function handleStepSign(stepId: string, data: { signature_data: string; notes?: string; actual_value?: number }) {
    if (!id) return;
    const updated = await batchService.signStep(id, stepId, {
      performed_by: user?.full_name ?? '',
      ...data,
    });
    setSteps(prev => prev.map(s => s.id === stepId ? updated : s));
  }

  async function handleGenerateReport() {
    if (!id) return;
    setGeneratingPdf(true);
    try { await batchService.generateReport(id); setPdfReady(true); }
    catch { alert('Failed to generate report.'); }
    finally { setGeneratingPdf(false); }
  }

  const getStatusVariant = (status: Batch['status']) => {
    const map = { active: 'info', completed: 'success', cancelled: 'danger', draft: 'default' } as const;
    return map[status] ?? 'default';
  };

  const completedCount = steps.filter(s => s.status === 'completed' || s.status === 'skipped').length;
  const progressPct = steps.length ? Math.round((completedCount / steps.length) * 100) : 0;

  if (loading) return (
    <Layout>
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    </Layout>
  );

  if (error || !batch) return (
    <Layout>
      <div className="text-center py-12">
        <p className="text-red-500 mb-4">{error || 'Batch not found'}</p>
        <Button onClick={() => navigate('/batches')}>Back to Batches</Button>
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center">
            <button onClick={() => navigate('/batches')} className="mr-4 text-gray-500 hover:text-gray-700">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-gray-900">Batch {batch.batch_number}</h2>
                <Badge variant={getStatusVariant(batch.status)}>{batch.status}</Badge>
              </div>
              <p className="text-gray-500">{batch.product_name} — {batch.batch_size.toLocaleString()} kg</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {batch.status === 'draft' && (
              <Button onClick={handleStart} variant="outline">
                <Play className="w-4 h-4 mr-2" />Start Batch
              </Button>
            )}
            {batch.status === 'active' && (
              <Button onClick={handleComplete}>
                <CheckCircle className="w-4 h-4 mr-2" />Complete Batch
              </Button>
            )}
            {(batch.status === 'draft' || batch.status === 'active') && (
              <Button onClick={handleCancel} variant="danger">
                <XCircle className="w-4 h-4 mr-2" />Cancel
              </Button>
            )}
            {batch.status === 'completed' && (
              pdfReady ? (
                <Button onClick={() => window.open(batchService.getReportDownloadUrl(id!), '_blank')}>
                  <FileDown className="w-4 h-4 mr-2" />Download PDF
                </Button>
              ) : (
                <Button onClick={handleGenerateReport} disabled={generatingPdf} variant="outline">
                  {generatingPdf
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</>
                    : <><FileDown className="w-4 h-4 mr-2" />Generate Report</>}
                </Button>
              )
            )}
            <Link to={`/audit?batch=${id}`}>
              <Button variant="outline">
                <ShieldCheck className="w-4 h-4 mr-2" />Audit Trail
              </Button>
            </Link>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Created By', value: batch.created_by },
            { label: 'Created', value: new Date(batch.created_at).toLocaleDateString() },
            { label: 'Started', value: batch.started_at ? new Date(batch.started_at).toLocaleDateString() : '—' },
            { label: 'Completed', value: batch.completed_at ? new Date(batch.completed_at).toLocaleDateString() : '—' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white p-4 rounded-lg shadow-sm border">
              <p className="text-xs text-gray-500 uppercase font-medium mb-1">{label}</p>
              <p className="font-semibold">{value}</p>
            </div>
          ))}
        </div>

        {/* Step Progress */}
        {steps.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium text-gray-700 flex items-center gap-1">
                <ClipboardList className="w-4 h-4" />Step Progress
              </span>
              <span className="text-gray-500">{completedCount} / {steps.length} ({progressPct}%)</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div className="bg-green-500 h-3 rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        )}

        {/* Steps */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-900">Production Steps</h3>
          {steps.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border p-8 text-center text-gray-500">
              No steps defined. Create this batch from a recipe to auto-generate steps.
            </div>
          ) : (
            steps.map(step => (
              <StepCard
                key={step.id}
                step={step}
                batchStatus={batch.status}
                operatorName={user?.full_name ?? ''}
                onStart={handleStepStart}
                onComplete={handleStepComplete}
                onSign={handleStepSign}
              />
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}
