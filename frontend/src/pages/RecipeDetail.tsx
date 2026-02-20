import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/Button';
import { recipeService } from '../services/api';
import type { Recipe } from '../types';
import {
  ArrowLeft, Ruler, ShieldCheck, Wrench, ClipboardCheck,
  PenLine, Clock, Loader2, FlaskConical,
} from 'lucide-react';

const STEP_TYPE_CONFIG = {
  manual: { label: 'Manual', icon: ClipboardCheck, color: 'bg-gray-100 text-gray-700' },
  measurement: { label: 'Measurement', icon: Ruler, color: 'bg-blue-100 text-blue-700' },
  verification: { label: 'Verification', icon: ShieldCheck, color: 'bg-yellow-100 text-yellow-700' },
  equipment_check: { label: 'Equipment Check', icon: Wrench, color: 'bg-purple-100 text-purple-700' },
};

export function RecipeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    recipeService.getRecipe(id)
      .then(setRecipe)
      .catch(() => setError('Failed to load recipe'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <Layout>
      <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
    </Layout>
  );

  if (error || !recipe) return (
    <Layout>
      <div className="text-center py-12">
        <p className="text-red-500 mb-4">{error || 'Recipe not found'}</p>
        <Button onClick={() => navigate('/recipes')}>Back to Recipes</Button>
      </div>
    </Layout>
  );

  const totalTime = recipe.steps?.reduce((acc, s) => acc + (s.duration_minutes || 0), 0) || 0;

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <button onClick={() => navigate('/recipes')} className="mt-1 text-gray-500 hover:text-gray-700">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{recipe.name}</h2>
              <p className="text-gray-500 mt-1">{recipe.product_name} — Version {recipe.version}</p>
              {recipe.description && <p className="text-sm text-gray-600 mt-2 max-w-xl">{recipe.description}</p>}
            </div>
          </div>
          <Link to={`/batches/new?recipe_id=${recipe.id}`}>
            <Button>
              <FlaskConical className="w-4 h-4 mr-2" />
              Use This Recipe
            </Button>
          </Link>
        </div>

        {/* Meta */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg border shadow-sm text-center">
            <p className="text-2xl font-bold text-gray-900">{recipe.steps?.length || 0}</p>
            <p className="text-sm text-gray-500 mt-1">Total Steps</p>
          </div>
          <div className="bg-white p-4 rounded-lg border shadow-sm text-center">
            <p className="text-2xl font-bold text-gray-900">{totalTime}</p>
            <p className="text-sm text-gray-500 mt-1">Est. Minutes</p>
          </div>
          <div className="bg-white p-4 rounded-lg border shadow-sm text-center">
            <p className="text-2xl font-bold text-gray-900">
              {recipe.steps?.filter(s => s.requires_signature).length || 0}
            </p>
            <p className="text-sm text-gray-500 mt-1">Signatures Required</p>
          </div>
        </div>

        {/* Steps */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Process Steps</h3>
          </div>
          <div className="divide-y">
            {(recipe.steps || []).map(step => {
              const config = STEP_TYPE_CONFIG[step.step_type] || STEP_TYPE_CONFIG.manual;
              const Icon = config.icon;
              return (
                <div key={step.id} className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-700">
                      {step.step_number}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900">{step.description}</h4>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
                          <Icon className="w-3 h-3" />{config.label}
                        </span>
                        {step.requires_signature && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                            <PenLine className="w-3 h-3" />Signature Required
                          </span>
                        )}
                      </div>
                      {step.instructions && (
                        <p className="text-sm text-gray-600 bg-gray-50 rounded p-2 mt-2">{step.instructions}</p>
                      )}
                      <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
                        {step.expected_value != null && (
                          <span className="flex items-center gap-1">
                            <Ruler className="w-3 h-3" />
                            Expected: <strong>{step.expected_value} {step.unit}</strong>
                          </span>
                        )}
                        {step.duration_minutes && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            ~{step.duration_minutes} min
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-xs text-gray-400 text-center">
          Recipe created by {recipe.created_by} · Last updated {new Date(recipe.updated_at).toLocaleDateString()}
        </p>
      </div>
    </Layout>
  );
}
