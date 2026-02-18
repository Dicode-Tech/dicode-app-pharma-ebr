import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { batchService } from '../services/api';
import type { Batch } from '../types';
import { PlusCircle, Search, Play, CheckCircle, XCircle } from 'lucide-react';

export function BatchList() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<Batch['status'] | 'all'>('all');

  useEffect(() => {
    loadBatches();
  }, []);

  const loadBatches = async () => {
    try {
      setLoading(true);
      const data = await batchService.getAllBatches();
      setBatches(data);
    } catch (err) {
      setError('Failed to load batches');
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async (id: string) => {
    try {
      await batchService.startBatch(id, 'current-user');
      loadBatches();
    } catch (err) {
      alert('Failed to start batch');
    }
  };

  const handleComplete = async (id: string) => {
    try {
      await batchService.completeBatch(id, 'current-user');
      loadBatches();
    } catch (err) {
      alert('Failed to complete batch');
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this batch?')) return;
    try {
      await batchService.cancelBatch(id, 'current-user');
      loadBatches();
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

  const filteredBatches = batches
    .filter(b => filter === 'all' || b.status === filter)
    .filter(b => 
      b.batch_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.product_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Batches</h2>
          <Link to="/batches/new">
            <Button>
              <PlusCircle className="w-4 h-4 mr-2" />
              New Batch
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search batches..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as Batch['status'] | 'all')}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm border">
          {loading ? (
            <div className="p-6 text-center text-gray-500">Loading...</div>
          ) : error ? (
            <div className="p-6 text-center text-red-500">{error}</div>
          ) : filteredBatches.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              {searchTerm || filter !== 'all' ? 'No batches match your filters' : 'No batches yet'}
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredBatches.map((batch) => (
                  <tr key={batch.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <Link to={`/batches/${batch.id}`} className="hover:text-primary-600">
                        {batch.batch_number}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {batch.product_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {batch.batch_size.toLocaleString()} units
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={getStatusVariant(batch.status)}>
                        {batch.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(batch.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <Link 
                          to={`/batches/${batch.id}`}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          View
                        </Link>
                        {batch.status === 'draft' && (
                          <button
                            onClick={() => handleStart(batch.id)}
                            className="text-green-600 hover:text-green-900 flex items-center"
                            title="Start Batch"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        )}
                        {batch.status === 'active' && (
                          <button
                            onClick={() => handleComplete(batch.id)}
                            className="text-blue-600 hover:text-blue-900 flex items-center"
                            title="Complete Batch"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        {(batch.status === 'draft' || batch.status === 'active') && (
                          <button
                            onClick={() => handleCancel(batch.id)}
                            className="text-red-600 hover:text-red-900 flex items-center"
                            title="Cancel Batch"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="text-sm text-gray-500">
          Showing {filteredBatches.length} of {batches.length} batches
        </div>
      </div>
    </Layout>
  );
}
