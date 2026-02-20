import { useState } from 'react';
import {
  Play, CheckCircle, SkipForward, ChevronDown, ChevronUp,
  User, Clock, PenLine, Ruler, ShieldCheck, Wrench, ClipboardCheck,
} from 'lucide-react';
import type { BatchStep } from '../types';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { SignaturePad } from './SignaturePad';

interface StepCardProps {
  step: BatchStep;
  batchStatus: string;
  operatorName: string;
  onStart: (stepId: string) => Promise<void>;
  onComplete: (stepId: string, data: { notes?: string; actual_value?: number }) => Promise<void>;
  onSign: (stepId: string, data: { signature_data: string; notes?: string; actual_value?: number }) => Promise<void>;
}

const STEP_TYPE_CONFIG = {
  manual: { label: 'Manual', icon: ClipboardCheck, color: 'bg-gray-100 text-gray-700' },
  measurement: { label: 'Measurement', icon: Ruler, color: 'bg-blue-100 text-blue-700' },
  verification: { label: 'Verification', icon: ShieldCheck, color: 'bg-yellow-100 text-yellow-700' },
  equipment_check: { label: 'Equipment', icon: Wrench, color: 'bg-purple-100 text-purple-700' },
};

const STATUS_STYLES = {
  pending: 'bg-gray-100 text-gray-500 border border-gray-300',
  in_progress: 'bg-blue-600 text-white animate-pulse',
  completed: 'bg-green-600 text-white',
  skipped: 'bg-yellow-500 text-white',
};

export function StepCard({ step, batchStatus, operatorName, onStart, onComplete, onSign }: StepCardProps) {
  const [expanded, setExpanded] = useState(step.status === 'in_progress');
  const [notes, setNotes] = useState(step.notes || '');
  const [actualValue, setActualValue] = useState<string>(step.actual_value?.toString() || '');
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [loading, setLoading] = useState(false);

  const typeConfig = STEP_TYPE_CONFIG[step.step_type] || STEP_TYPE_CONFIG.manual;
  const TypeIcon = typeConfig.icon;

  const canInteract = batchStatus === 'active';
  const isCompleted = step.status === 'completed' || step.status === 'skipped';

  async function handleStart() {
    setLoading(true);
    try {
      await onStart(step.id);
      setExpanded(true);
    } finally {
      setLoading(false);
    }
  }

  async function handleComplete() {
    if (step.requires_signature) {
      setShowSignaturePad(true);
      return;
    }
    setLoading(true);
    try {
      await onComplete(step.id, {
        notes: notes || undefined,
        actual_value: actualValue ? parseFloat(actualValue) : undefined,
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSign(dataUrl: string) {
    setShowSignaturePad(false);
    setLoading(true);
    try {
      await onSign(step.id, {
        signature_data: dataUrl,
        notes: notes || undefined,
        actual_value: actualValue ? parseFloat(actualValue) : undefined,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {showSignaturePad && (
        <SignaturePad
          operatorName={operatorName}
          onSave={handleSign}
          onCancel={() => setShowSignaturePad(false)}
        />
      )}

      <div className={`border rounded-lg overflow-hidden ${isCompleted ? 'bg-green-50 border-green-200' : step.status === 'in_progress' ? 'bg-blue-50 border-blue-300 shadow-md' : 'bg-white border-gray-200'}`}>
        <div
          className="flex items-center gap-4 p-4 cursor-pointer"
          onClick={() => setExpanded((v) => !v)}
        >
          {/* Step number circle */}
          <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${STATUS_STYLES[step.status]}`}>
            {step.status === 'completed' ? <CheckCircle className="w-5 h-5" /> :
             step.status === 'skipped' ? <SkipForward className="w-4 h-4" /> :
             step.step_number}
          </div>

          {/* Title area */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-semibold text-gray-900">{step.description}</h4>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${typeConfig.color}`}>
                <TypeIcon className="w-3 h-3" />
                {typeConfig.label}
              </span>
              {step.requires_signature && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                  <PenLine className="w-3 h-3" />
                  Signature Required
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
              {step.status === 'completed' && step.performed_by && (
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {step.performed_by}
                </span>
              )}
              {step.completed_at && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(step.completed_at).toLocaleString()}
                </span>
              )}
              {step.expected_value != null && (
                <span>
                  Expected: <strong>{step.expected_value} {step.unit}</strong>
                  {step.actual_value != null && (
                    <> → Actual: <strong className="text-green-700">{step.actual_value} {step.unit}</strong></>
                  )}
                </span>
              )}
            </div>
          </div>

          {/* Right side: action button or chevron */}
          <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            {step.status === 'pending' && canInteract && (
              <Button size="sm" variant="outline" onClick={handleStart} disabled={loading}>
                <Play className="w-4 h-4 mr-1" />
                Start
              </Button>
            )}
            {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </div>
        </div>

        {/* Expanded content */}
        {expanded && (
          <div className="border-t border-gray-200 p-4 space-y-4 bg-white">
            {step.instructions && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Procedure</p>
                <p className="text-sm text-gray-700">{step.instructions}</p>
              </div>
            )}

            {/* Signature display for completed steps */}
            {step.signature_data && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Electronic Signature</p>
                <img src={step.signature_data} alt="Operator signature" className="h-12 border border-gray-200 rounded bg-white p-1" />
              </div>
            )}

            {/* Measurement input for in_progress steps */}
            {step.status === 'in_progress' && canInteract && (
              <div className="space-y-3">
                {step.step_type === 'measurement' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Actual Value {step.unit && <span className="text-gray-500">({step.unit})</span>}
                      {step.expected_value != null && (
                        <span className="ml-2 text-xs text-gray-400">Expected: {step.expected_value}</span>
                      )}
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={actualValue}
                      onChange={(e) => setActualValue(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder={`Enter actual value in ${step.unit || 'units'}`}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="Add observations, deviations, or comments..."
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleComplete} disabled={loading} className="flex-1">
                    {step.requires_signature ? (
                      <><PenLine className="w-4 h-4 mr-2" />Sign & Complete</>
                    ) : (
                      <><CheckCircle className="w-4 h-4 mr-2" />Mark Complete</>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Notes display for completed steps */}
            {step.status === 'completed' && step.notes && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Operator Notes</p>
                <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">{step.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
