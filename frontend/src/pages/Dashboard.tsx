import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { batchService, integrationService } from '../services/api';
import type { Batch } from '../types';
import { Activity, CheckCircle, Clock, FlaskConical, Radio, AlertTriangle } from 'lucide-react';

export function Dashboard() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [opcConnected, setOpcConnected] = useState<boolean | null>(null);
  const [alarmCount, setAlarmCount] = useState(0);

  useEffect(() => {
    Promise.all([
      batchService.getAllBatches(),
      integrationService.getStatus().catch(() => null),
      integrationService.getAlarms().catch(() => ({ alarms: [] })),
    ]).then(([batchData, status, alarmsData]) => {
      setBatches(batchData);
      setOpcConnected(status?.connected ?? null);
      setAlarmCount(alarmsData.alarms?.length || 0);
    }).catch(() => setError('Failed to load data'))
      .finally(() => setLoading(false));
  }, []);

  const getStatusVariant = (status: Batch['status']) => {
    const map = { active: 'info', completed: 'success', cancelled: 'danger', draft: 'default' } as const;
    return map[status] ?? 'default';
  };

  const stats = {
    total: batches.length,
    active: batches.filter(b => b.status === 'active').length,
    completed: batches.filter(b => b.status === 'completed').length,
    draft: batches.filter(b => b.status === 'draft').length,
  };

  const activeBatches = batches.filter(b => b.status === 'active');
  const recentBatches = batches.slice(0, 6);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
          <Link to="/batches/new">
            <Button>
              <FlaskConical className="w-4 h-4 mr-2" />
              New Batch
            </Button>
          </Link>
        </div>

        {/* OPC-UA Status Banner */}
        {opcConnected !== null && (
          <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-sm ${opcConnected ? 'bg-green-50 border-green-200 text-green-800' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
            <Radio className="w-4 h-4 flex-shrink-0" />
            <span>OPC-UA: <strong>{opcConnected ? 'Connected' : 'Disconnected'}</strong></span>
            {alarmCount > 0 && (
              <span className="flex items-center gap-1 ml-2 text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full text-xs font-medium">
                <AlertTriangle className="w-3 h-3" />{alarmCount} alarm(s)
              </span>
            )}
            <Link to="/integrations" className="ml-auto text-xs underline opacity-70 hover:opacity-100">
              View details →
            </Link>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Batches', value: stats.total, icon: Activity, bg: 'bg-blue-100', color: 'text-blue-600' },
            { label: 'Active', value: stats.active, icon: Clock, bg: 'bg-yellow-100', color: 'text-yellow-600' },
            { label: 'Completed', value: stats.completed, icon: CheckCircle, bg: 'bg-green-100', color: 'text-green-600' },
            { label: 'Draft', value: stats.draft, icon: FlaskConical, bg: 'bg-gray-100', color: 'text-gray-600' },
          ].map(({ label, value, icon: Icon, bg, color }) => (
            <div key={label} className="bg-white p-5 rounded-lg shadow-sm border">
              <div className="flex items-center">
                <div className={`p-3 rounded-full ${bg} ${color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">{label}</p>
                  <p className="text-2xl font-bold text-gray-900">{loading ? '—' : value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Active Batches with Progress */}
        {activeBatches.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-yellow-500" />
                Active Batches
              </h3>
            </div>
            <div className="divide-y">
              {activeBatches.map(batch => {
                const pct = batch.total_steps
                  ? Math.round(((batch.completed_steps || 0) / batch.total_steps) * 100)
                  : 0;
                return (
                  <div key={batch.id} className="px-6 py-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <Link to={`/batches/${batch.id}`} className="font-semibold text-gray-900 hover:text-primary-600">
                          {batch.batch_number}
                        </Link>
                        <span className="text-gray-500 text-sm ml-2">{batch.product_name}</span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {batch.completed_steps || 0}/{batch.total_steps || 0} steps
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent Batches */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Recent Batches</h3>
          </div>

          {loading ? (
            <div className="p-6 text-center text-gray-500">Loading...</div>
          ) : error ? (
            <div className="p-6 text-center text-red-500">{error}</div>
          ) : recentBatches.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No batches yet.{' '}
              <Link to="/batches/new" className="text-primary-600 hover:underline">Create your first batch</Link>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Batch #</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Progress</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Created</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentBatches.map(batch => {
                  const pct = batch.total_steps
                    ? Math.round(((batch.completed_steps || 0) / batch.total_steps) * 100)
                    : 0;
                  return (
                    <tr key={batch.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Link to={`/batches/${batch.id}`} className="hover:text-primary-600">{batch.batch_number}</Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{batch.product_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={getStatusVariant(batch.status)}>{batch.status}</Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 w-32">
                        {batch.total_steps ? (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                              <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs">{pct}%</span>
                          </div>
                        ) : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(batch.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link to={`/batches/${batch.id}`} className="text-primary-600 hover:text-primary-900">View</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          <div className="px-6 py-4 border-t bg-gray-50">
            <Link to="/batches" className="text-sm text-primary-600 hover:text-primary-900 font-medium">
              View all batches →
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
