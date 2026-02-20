import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { batchService } from '../services/api';
import type { AuditLogEntry } from '../types';
import { ShieldCheck, Loader2, ExternalLink } from 'lucide-react';

const ACTION_STYLES: Record<string, string> = {
  start: 'bg-blue-100 text-blue-800',
  complete: 'bg-green-100 text-green-800',
  cancel: 'bg-red-100 text-red-800',
  step_signed: 'bg-purple-100 text-purple-800',
  step_completed: 'bg-green-100 text-green-700',
  step_in_progress: 'bg-yellow-100 text-yellow-800',
  step_skipped: 'bg-orange-100 text-orange-800',
  batch_created: 'bg-gray-100 text-gray-700',
};

function ActionBadge({ action }: { action: string }) {
  const style = ACTION_STYLES[action] || 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${style}`}>
      {action.replace(/_/g, ' ')}
    </span>
  );
}

export function AuditTrail() {
  const [searchParams] = useSearchParams();
  const batchId = searchParams.get('batch');
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetch = batchId
      ? batchService.getBatchAuditLog(batchId)
      : batchService.getAllAuditLogs();
    fetch
      .then(setLogs)
      .catch(() => setError('Failed to load audit trail'))
      .finally(() => setLoading(false));
  }, [batchId]);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-7 h-7 text-primary-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {batchId ? 'Batch Audit Trail' : 'Global Audit Trail'}
            </h2>
            <p className="text-gray-500 text-sm">
              21 CFR Part 11 compliant electronic audit trail
              {batchId && <> — <Link to="/audit" className="text-primary-600 hover:underline">View all</Link></>}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          {loading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : error ? (
            <div className="text-center text-red-500 p-8">{error}</div>
          ) : logs.length === 0 ? (
            <div className="text-center text-gray-500 p-12">No audit events found.</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Timestamp</th>
                  {!batchId && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Batch</th>}
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Action</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Performed By</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('en-GB', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit', second: '2-digit',
                      })}
                    </td>
                    {!batchId && (
                      <td className="px-4 py-3 text-sm font-medium">
                        {log.batch_number ? (
                          <Link to={`/batches/${log.batch_id}`} className="text-primary-600 hover:underline flex items-center gap-1">
                            {log.batch_number} <ExternalLink className="w-3 h-3" />
                          </Link>
                        ) : '—'}
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <ActionBadge action={log.action} />
                      {log.step_number && (
                        <div className="text-xs text-gray-400 mt-0.5">Step {log.step_number}: {log.step_description}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {log.performed_by || <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-xs">
                      {log.details
                        ? Object.entries(log.details).map(([k, v]) => (
                            <span key={k} className="mr-2">
                              <span className="font-medium text-gray-600">{k}:</span> {String(v)}
                            </span>
                          ))
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {!loading && logs.length > 0 && (
          <p className="text-xs text-gray-400 text-center">{logs.length} audit event(s) — all times in local timezone</p>
        )}
      </div>
    </Layout>
  );
}
