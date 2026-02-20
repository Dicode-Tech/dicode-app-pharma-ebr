import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/Button';
import { auditService, batchService } from '../services/api';
import type { AuditLogEntry, AuditEntityType } from '../types';
import {
  ShieldCheck, Loader2, ExternalLink,
  FlaskConical, BookOpen, Users, LogIn, ChevronDown,
} from 'lucide-react';

// ─── Event code display helpers ───────────────────────────────────────────────

/** Convert 'batch.step.signed' → 'Batch Step Signed' */
function formatAction(action: string): string {
  return action
    .split('.')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// Color per entity category
const CATEGORY_BADGE: Record<string, string> = {
  batch:   'bg-blue-100 text-blue-800',
  recipe:  'bg-indigo-100 text-indigo-800',
  user:    'bg-amber-100 text-amber-800',
  session: 'bg-green-100 text-green-800',
};

// Override for specific events
const ACTION_OVERRIDE: Record<string, string> = {
  'auth.login.failed': 'bg-red-100 text-red-800',
  'batch.cancelled':   'bg-red-100 text-red-800',
  'batch.step.signed': 'bg-purple-100 text-purple-800',
  'recipe.deleted':    'bg-red-100 text-red-800',
  'user.deactivated':  'bg-red-100 text-red-800',
};

function ActionBadge({ action, entityType }: { action: string; entityType?: string }) {
  const style = ACTION_OVERRIDE[action]
    || CATEGORY_BADGE[entityType || '']
    || 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${style}`}>
      {formatAction(action)}
    </span>
  );
}

// ─── Category tab definitions ─────────────────────────────────────────────────

type TabId = 'all' | AuditEntityType;

const TABS: { id: TabId; label: string; icon: typeof ShieldCheck }[] = [
  { id: 'all',     label: 'All Events', icon: ShieldCheck },
  { id: 'batch',   label: 'Batches',    icon: FlaskConical },
  { id: 'recipe',  label: 'Recipes',    icon: BookOpen },
  { id: 'user',    label: 'Users',      icon: Users },
  { id: 'session', label: 'Sessions',   icon: LogIn },
];

// Category icon mapping for the table
const ENTITY_ICON: Record<string, typeof ShieldCheck> = {
  batch:   FlaskConical,
  recipe:  BookOpen,
  user:    Users,
  session: LogIn,
};

// ─── Entity link helper ────────────────────────────────────────────────────────

function EntityCell({ log }: { log: AuditLogEntry }) {
  if (log.entity_type === 'batch' && log.batch_id) {
    return (
      <Link to={`/batches/${log.batch_id}`} className="text-primary-600 hover:underline flex items-center gap-1 text-sm">
        {log.entity_name || log.batch_number || log.batch_id.slice(0, 8)}
        <ExternalLink className="w-3 h-3" />
      </Link>
    );
  }
  if (log.entity_type === 'recipe' && log.entity_id) {
    return (
      <Link to={`/recipes/${log.entity_id}`} className="text-primary-600 hover:underline flex items-center gap-1 text-sm">
        {log.entity_name || log.entity_id.slice(0, 8)}
        <ExternalLink className="w-3 h-3" />
      </Link>
    );
  }
  if (log.entity_name) {
    return <span className="text-sm text-gray-700">{log.entity_name}</span>;
  }
  return <span className="text-gray-300">—</span>;
}

// ─── Main component ────────────────────────────────────────────────────────────

const PAGE_SIZE = 50;

export function AuditTrail() {
  const [searchParams] = useSearchParams();
  const batchId = searchParams.get('batch');

  const [activeTab, setActiveTab] = useState<TabId>('all');
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState('');

  const fetchLogs = useCallback(async (tab: TabId, offset: number, append: boolean) => {
    if (offset === 0) setLoading(true); else setLoadingMore(true);
    try {
      let rows: AuditLogEntry[];
      if (batchId) {
        // Batch-specific view: use existing batch endpoint
        rows = await batchService.getBatchAuditLog(batchId);
        setHasMore(false);
      } else {
        rows = await auditService.getAll({
          entity_type: tab === 'all' ? undefined : tab as AuditEntityType,
          limit: PAGE_SIZE + 1,
          offset,
        });
        setHasMore(rows.length > PAGE_SIZE);
        rows = rows.slice(0, PAGE_SIZE);
      }
      setLogs((prev) => append ? [...prev, ...rows] : rows);
      setError('');
    } catch {
      setError('Failed to load audit trail');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [batchId]);

  useEffect(() => {
    setLogs([]);
    fetchLogs(activeTab, 0, false);
  }, [activeTab, batchId, fetchLogs]);

  function loadMore() {
    fetchLogs(activeTab, logs.length, true);
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-7 h-7 text-primary-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {batchId ? 'Batch Audit Trail' : 'System Audit Trail'}
            </h2>
            <p className="text-gray-500 text-sm">
              21 CFR Part 11 compliant electronic audit trail
              {batchId && <> — <Link to="/audit" className="text-primary-600 hover:underline">View all events</Link></>}
            </p>
          </div>
        </div>

        {/* Category tabs — only shown in global view */}
        {!batchId && (
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex gap-5 overflow-x-auto">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex items-center gap-2 pb-3 px-1 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                    activeTab === id
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </nav>
          </div>
        )}

        {/* Table */}
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
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Timestamp</th>
                    {!batchId && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Category</th>}
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Event</th>
                    {!batchId && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Entity</th>}
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Performed By</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">IP Address</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {logs.map(log => {
                    const CategoryIcon = log.entity_type ? ENTITY_ICON[log.entity_type] : null;
                    return (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString('en-GB', {
                            day: '2-digit', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit', second: '2-digit',
                          })}
                        </td>

                        {!batchId && (
                          <td className="px-4 py-3">
                            {log.entity_type ? (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_BADGE[log.entity_type] || 'bg-gray-100 text-gray-600'}`}>
                                {CategoryIcon && <CategoryIcon className="w-3 h-3" />}
                                {log.entity_type.charAt(0).toUpperCase() + log.entity_type.slice(1)}
                              </span>
                            ) : <span className="text-gray-300">—</span>}
                          </td>
                        )}

                        <td className="px-4 py-3">
                          <ActionBadge action={log.action} entityType={log.entity_type} />
                          {log.step_number != null && (
                            <div className="text-xs text-gray-400 mt-0.5">
                              Step {log.step_number}: {log.step_description}
                            </div>
                          )}
                        </td>

                        {!batchId && (
                          <td className="px-4 py-3">
                            <EntityCell log={log} />
                          </td>
                        )}

                        <td className="px-4 py-3 text-sm text-gray-700">
                          {log.performed_by || <span className="text-gray-300">—</span>}
                        </td>

                        <td className="px-4 py-3 text-xs text-gray-400 font-mono whitespace-nowrap">
                          {log.ip_address || <span className="text-gray-300">—</span>}
                        </td>

                        <td className="px-4 py-3 text-xs text-gray-500 max-w-xs">
                          {log.details
                            ? Object.entries(log.details)
                                .filter(([, v]) => v != null && v !== '' && !Array.isArray(v))
                                .map(([k, v]) => (
                                  <span key={k} className="mr-2 whitespace-nowrap">
                                    <span className="font-medium text-gray-600">{k}:</span> {String(v)}
                                  </span>
                                ))
                            : '—'}
                          {log.details?.changed_fields && Array.isArray(log.details.changed_fields) && (
                            <span className="mr-2">
                              <span className="font-medium text-gray-600">fields:</span>{' '}
                              {(log.details.changed_fields as string[]).join(', ')}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && logs.length > 0 && (
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>{logs.length} event(s) — all times in local timezone</span>
            {hasMore && (
              <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
                {loadingMore
                  ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Loading…</>
                  : <><ChevronDown className="w-3 h-3 mr-1" />Load more</>}
              </Button>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
