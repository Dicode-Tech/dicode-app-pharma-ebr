import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/Button';
import { batchService } from '../services/api';
import { ArrowLeft } from 'lucide-react';

export function BatchCreate() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    batch_number: '',
    product_name: '',
    batch_size: '',
    created_by: 'Demo User',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await batchService.createBatch({
        batch_number: formData.batch_number,
        product_name: formData.product_name,
        batch_size: parseInt(formData.batch_size),
        created_by: formData.created_by,
      });
      navigate('/batches');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create batch');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center mb-6">
          <button
            onClick={() => navigate('/batches')}
            className="mr-4 text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-2xl font-bold text-gray-900">Create New Batch</h2>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="batch_number" className="block text-sm font-medium text-gray-700 mb-1">
                Batch Number *
              </label>
              <input
                type="text"
                id="batch_number"
                name="batch_number"
                required
                value={formData.batch_number}
                onChange={handleChange}
                placeholder="e.g., B2026-001"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <p className="mt-1 text-sm text-gray-500">Unique identifier for this batch</p>
            </div>

            <div>
              <label htmlFor="product_name" className="block text-sm font-medium text-gray-700 mb-1">
                Product Name *
              </label>
              <input
                type="text"
                id="product_name"
                name="product_name"
                required
                value={formData.product_name}
                onChange={handleChange}
                placeholder="e.g., Paracetamol 500mg Tablets"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="batch_size" className="block text-sm font-medium text-gray-700 mb-1">
                Batch Size *
              </label>
              <input
                type="number"
                id="batch_size"
                name="batch_size"
                required
                min="1"
                value={formData.batch_size}
                onChange={handleChange}
                placeholder="e.g., 10000"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <p className="mt-1 text-sm text-gray-500">Number of units to produce</p>
            </div>

            <div>
              <label htmlFor="created_by" className="block text-sm font-medium text-gray-700 mb-1">
                Created By *
              </label>
              <input
                type="text"
                id="created_by"
                name="created_by"
                required
                value={formData.created_by}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/batches')}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1"
              >
                {loading ? 'Creating...' : 'Create Batch'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
