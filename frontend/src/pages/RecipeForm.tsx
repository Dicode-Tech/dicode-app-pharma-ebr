import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/Button';
import { recipeService } from '../services/api';
import type { RecipeStep } from '../types';
import { Plus, Trash2, ChevronUp, ChevronDown, Loader2, ArrowLeft } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type StepType = RecipeStep['step_type'];

interface StepDraft {
  description: string;
  step_type: StepType;
  instructions: string;
  expected_value: string;
  unit: string;
  requires_signature: boolean;
  duration_minutes: string;
}

const STEP_TYPES: { value: StepType; label: string }[] = [
  { value: 'manual', label: 'Manual' },
  { value: 'measurement', label: 'Measurement' },
  { value: 'verification', label: 'Verification' },
  { value: 'equipment_check', label: 'Equipment Check' },
];

const EMPTY_STEP: StepDraft = {
  description: '',
  step_type: 'manual',
  instructions: '',
  expected_value: '',
  unit: '',
  requires_signature: false,
  duration_minutes: '',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function RecipeForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Header fields
  const [name, setName] = useState('');
  const [productName, setProductName] = useState('');
  const [version, setVersion] = useState('1.0');
  const [description, setDescription] = useState('');

  // Steps
  const [steps, setSteps] = useState<StepDraft[]>([{ ...EMPTY_STEP }]);

  useEffect(() => {
    if (!isEdit || !id) return;
    recipeService.getRecipe(id).then((r) => {
      setName(r.name);
      setProductName(r.product_name);
      setVersion(r.version);
      setDescription(r.description || '');
      setSteps(
        (r.steps || []).map((s) => ({
          description: s.description,
          step_type: s.step_type,
          instructions: s.instructions || '',
          expected_value: s.expected_value != null ? String(s.expected_value) : '',
          unit: s.unit || '',
          requires_signature: s.requires_signature,
          duration_minutes: s.duration_minutes != null ? String(s.duration_minutes) : '',
        }))
      );
    }).catch(() => setError('Failed to load recipe')).finally(() => setLoading(false));
  }, [id, isEdit]);

  function updateStep(index: number, patch: Partial<StepDraft>) {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function addStep() {
    setSteps((prev) => [...prev, { ...EMPTY_STEP }]);
  }

  function removeStep(index: number) {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  }

  function moveStep(index: number, direction: -1 | 1) {
    const next = index + direction;
    if (next < 0 || next >= steps.length) return;
    setSteps((prev) => {
      const arr = [...prev];
      [arr[index], arr[next]] = [arr[next], arr[index]];
      return arr;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const payload = {
      name,
      product_name: productName,
      version,
      description: description || undefined,
      steps: steps.map((s) => ({
        description: s.description,
        step_type: s.step_type,
        instructions: s.instructions || undefined,
        expected_value: s.expected_value ? parseFloat(s.expected_value) : undefined,
        unit: s.unit || undefined,
        requires_signature: s.requires_signature,
        duration_minutes: s.duration_minutes ? parseInt(s.duration_minutes, 10) : undefined,
      })),
    };

    try {
      if (isEdit && id) {
        await recipeService.updateRecipeWithSteps(id, payload);
        navigate(`/recipes/${id}`);
      } else {
        const created = await recipeService.createRecipe(payload);
        navigate(`/recipes/${created.id}`);
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setError(axiosErr.response?.data?.error || 'An error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = 'w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent';
  const labelClass = 'block text-xs font-medium text-gray-700 mb-1';

  if (loading) return (
    <Layout>
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(isEdit && id ? `/recipes/${id}` : '/recipes')} className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edit Recipe' : 'New Recipe'}
          </h2>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Recipe header */}
          <div className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Recipe Details</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className={labelClass}>Recipe Name *</label>
                <input
                  type="text" required className={inputClass}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Amoxicillin 500mg Capsule Batch"
                />
              </div>
              <div>
                <label className={labelClass}>Product Name *</label>
                <input
                  type="text" required className={inputClass}
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="e.g. Amoxicillin 500mg"
                />
              </div>
              <div>
                <label className={labelClass}>Version *</label>
                <input
                  type="text" required className={inputClass}
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  placeholder="e.g. 1.0"
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Description</label>
                <textarea
                  rows={2} className={inputClass}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description"
                />
              </div>
            </div>
          </div>

          {/* Steps */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                Process Steps ({steps.length})
              </h3>
              <Button type="button" variant="outline" onClick={addStep}>
                <Plus className="w-4 h-4 mr-1" />Add Step
              </Button>
            </div>

            {steps.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                No steps yet. Click "Add Step" to begin.
              </div>
            ) : (
              <div className="divide-y">
                {steps.map((step, idx) => (
                  <div key={idx} className="p-5 space-y-3">
                    {/* Step header row */}
                    <div className="flex items-center gap-2">
                      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </span>
                      <div className="flex gap-1 ml-auto">
                        <button
                          type="button"
                          onClick={() => moveStep(idx, -1)}
                          disabled={idx === 0}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                          title="Move up"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveStep(idx, 1)}
                          disabled={idx === steps.length - 1}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                          title="Move down"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeStep(idx)}
                          className="p-1 text-gray-400 hover:text-red-600"
                          title="Remove step"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Step fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-9">
                      <div className="sm:col-span-2">
                        <label className={labelClass}>Description *</label>
                        <input
                          type="text" required className={inputClass}
                          value={step.description}
                          onChange={(e) => updateStep(idx, { description: e.target.value })}
                          placeholder="e.g. Weigh API and excipients"
                        />
                      </div>

                      <div>
                        <label className={labelClass}>Step Type</label>
                        <select
                          className={inputClass}
                          value={step.step_type}
                          onChange={(e) => updateStep(idx, { step_type: e.target.value as StepType })}
                        >
                          {STEP_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className={labelClass}>Duration (minutes)</label>
                        <input
                          type="number" min="0" className={inputClass}
                          value={step.duration_minutes}
                          onChange={(e) => updateStep(idx, { duration_minutes: e.target.value })}
                          placeholder="e.g. 30"
                        />
                      </div>

                      {step.step_type === 'measurement' && (
                        <>
                          <div>
                            <label className={labelClass}>Expected Value</label>
                            <input
                              type="number" step="any" className={inputClass}
                              value={step.expected_value}
                              onChange={(e) => updateStep(idx, { expected_value: e.target.value })}
                              placeholder="e.g. 10.5"
                            />
                          </div>
                          <div>
                            <label className={labelClass}>Unit</label>
                            <input
                              type="text" className={inputClass}
                              value={step.unit}
                              onChange={(e) => updateStep(idx, { unit: e.target.value })}
                              placeholder="e.g. kg, pH, °C"
                            />
                          </div>
                        </>
                      )}

                      <div className="sm:col-span-2">
                        <label className={labelClass}>Instructions</label>
                        <textarea
                          rows={2} className={inputClass}
                          value={step.instructions}
                          onChange={(e) => updateStep(idx, { instructions: e.target.value })}
                          placeholder="Detailed instructions for the operator..."
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox" id={`sig-${idx}`}
                          checked={step.requires_signature}
                          onChange={(e) => updateStep(idx, { requires_signature: e.target.checked })}
                          className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <label htmlFor={`sig-${idx}`} className="text-sm text-gray-700">Requires operator signature</label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(isEdit && id ? `/recipes/${id}` : '/recipes')}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="flex-1">
              {submitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Recipe'}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
