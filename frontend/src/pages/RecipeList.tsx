import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { recipeService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { Recipe } from '../types';
import { BookOpen, ChevronRight, Loader2, Plus, Upload } from 'lucide-react';

export function RecipeList() {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const canEdit = hasRole('admin', 'batch_manager');

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    load();
  }, []);

  function load() {
    setLoading(true);
    recipeService.getAllRecipes()
      .then(setRecipes)
      .catch(() => setError('Failed to load recipes'))
      .finally(() => setLoading(false));
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    const format: 'json' | 'xml' = ext === 'xml' ? 'xml' : 'json';

    setImporting(true);
    try {
      const text = await file.text();
      const data = format === 'json' ? JSON.parse(text) : text;
      await recipeService.importRecipe({ format, data });
      load();
    } catch {
      alert('Import failed. Please check the file format and try again.');
    } finally {
      setImporting(false);
      // Reset input so the same file can be re-selected if needed
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center flex-wrap gap-3">
          <h2 className="text-2xl font-bold text-gray-900">Recipes</h2>
          <div className="flex items-center gap-2">
            {canEdit && (
              <>
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importing}>
                  {importing
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Importing…</>
                    : <><Upload className="w-4 h-4 mr-2" />Import</>}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.xml"
                  className="hidden"
                  onChange={handleImportFile}
                />
                <Button onClick={() => navigate('/recipes/new')}>
                  <Plus className="w-4 h-4 mr-2" />New Recipe
                </Button>
              </>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
        ) : error ? (
          <div className="text-center text-red-500 p-8">{error}</div>
        ) : recipes.length === 0 ? (
          <div className="text-center p-12 bg-white rounded-lg shadow-sm border text-gray-400">
            No recipes yet.{canEdit && ' Click "New Recipe" to create one.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recipes.map(recipe => (
              <Link
                key={recipe.id}
                to={`/recipes/${recipe.id}`}
                className="bg-white rounded-lg shadow-sm border hover:shadow-md hover:border-primary-300 transition-all p-5 flex items-start gap-4"
              >
                <div className="p-3 rounded-lg bg-primary-100 text-primary-700 flex-shrink-0">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">{recipe.name}</h3>
                      <p className="text-sm text-gray-500 mt-0.5">{recipe.product_name}</p>
                    </div>
                    <Badge variant="default">v{recipe.version}</Badge>
                  </div>
                  {recipe.description && (
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">{recipe.description}</p>
                  )}
                  <div className="flex items-center justify-between mt-3 text-xs text-gray-400">
                    <span>By {recipe.created_by}</span>
                    <span className="flex items-center gap-1">
                      View steps <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
