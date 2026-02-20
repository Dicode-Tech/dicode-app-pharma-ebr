import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/Button';
import { batchService, recipeService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { Recipe } from '../types';
import { ArrowLeft, BookOpen, ClipboardList } from 'lucide-react';

export function BatchCreate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [formData, setFormData] = useState({
    batch_number: '',
    product_name: '',
    batch_size: '',
    created_by: user?.full_name ?? '',
    recipe_id: searchParams.get('recipe_id') || '',
  });

  useEffect(() => {
    recipeService.getAllRecipes().then(setRecipes).catch(() => {});
  }, []);

  useEffect(() => {
    if (formData.recipe_id && recipes.length) {
      const r = recipes.find(r => r.id === formData.recipe_id) || null;
      setSelectedRecipe(r);
      if (r) {
        setFormData(prev => ({ ...prev, product_name: r.product_name }));
      }
    } else {
      setSelectedRecipe(null);
    }
  }, [formData.recipe_id, recipes]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const batch = await batchService.createBatch({
        batch_number: formData.batch_number,
        product_name: formData.product_name,
        batch_size: parseFloat(formData.batch_size),
        created_by: formData.created_by,
        recipe_id: formData.recipe_id || undefined,
      });
      navigate(`/batches/${batch.id}`);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setError(axiosErr.response?.data?.error || 'Failed to create batch');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center mb-6">
          <button onClick={() => navigate('/batches')} className="mr-4 text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-2xl font-bold text-gray-900">Create New Batch</h2>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          {error && <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Recipe Selection */}
            <div>
              <label htmlFor="recipe_id" className={labelClass}>
                <BookOpen className="w-4 h-4 inline mr-1" />
                Recipe (Optional)
              </label>
              <select id="recipe_id" name="recipe_id" value={formData.recipe_id} onChange={handleChange} className={inputClass}>
                <option value="">— No recipe (manual steps) —</option>
                {recipes.map(r => (
                  <option key={r.id} value={r.id}>{r.name} (v{r.version})</option>
                ))}
              </select>
              {selectedRecipe && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                  <ClipboardList className="w-4 h-4 inline mr-1" />
                  <strong>{selectedRecipe.steps?.length || '?'} steps</strong> will be auto-generated from this recipe.
                  {selectedRecipe.description && <p className="mt-1 text-blue-700">{selectedRecipe.description}</p>}
                </div>
              )}
            </div>

            <div>
              <label htmlFor="batch_number" className={labelClass}>Batch Number *</label>
              <input
                type="text" id="batch_number" name="batch_number" required
                value={formData.batch_number} onChange={handleChange}
                placeholder="e.g., B2026-005"
                className={inputClass}
              />
              <p className="mt-1 text-xs text-gray-500">Unique identifier — must not duplicate existing batches</p>
            </div>

            <div>
              <label htmlFor="product_name" className={labelClass}>Product Name *</label>
              <input
                type="text" id="product_name" name="product_name" required
                value={formData.product_name} onChange={handleChange}
                placeholder="e.g., Paracetamol 500mg Tablets"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="batch_size" className={labelClass}>Batch Size (kg) *</label>
              <input
                type="number" id="batch_size" name="batch_size" required
                min="0.001" step="any"
                value={formData.batch_size} onChange={handleChange}
                placeholder="e.g., 500"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="created_by" className={labelClass}>Batch Manager *</label>
              <input
                type="text" id="created_by" name="created_by" required
                value={formData.created_by} onChange={handleChange}
                className={inputClass}
              />
            </div>

            <div className="flex gap-4 pt-2">
              <Button type="button" variant="outline" onClick={() => navigate('/batches')} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? 'Creating...' : 'Create Batch'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
