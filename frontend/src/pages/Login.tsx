import { useState } from 'react';
import { FlaskConical, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';

const DEMO_ACCOUNTS = [
  { email: 'admin@ebr.local', role: 'Admin' },
  { email: 'manager@ebr.local', role: 'Batch Manager' },
  { email: 'supervisor@ebr.local', role: 'Operator Supervisor' },
  { email: 'operator@ebr.local', role: 'Operator' },
  { email: 'qa@ebr.local', role: 'QA/QC' },
];

const DEFAULT_TENANT = import.meta.env.VITE_DEFAULT_TENANT || 'demo';

export function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenant, setTenant] = useState(DEFAULT_TENANT);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDemo, setShowDemo] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password, tenant.trim());
    } catch {
      setError('Invalid credentials or workspace.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-3 mb-2">
            <FlaskConical className="h-10 w-10" style={{ color: 'var(--brand-primary)' }} />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dicode EBR</h1>
              <p className="text-xs text-gray-400">Electronic Batch Records</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: 'var(--badge-bg)', color: 'var(--badge-text)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            GMP Compliant · 21 CFR Part 11
          </span>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Sign in to your workspace</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="tenant" className="block text-sm font-medium text-gray-700 mb-1">
                Workspace
              </label>
              <input
                id="tenant"
                type="text"
                required
                value={tenant}
                onChange={(e) => setTenant(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="demo"
              />
              <p className="text-xs text-gray-400 mt-1">Usually your company slug (e.g. <code>demo</code>).</p>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Signing in…' : 'Sign In'}
            </Button>
          </form>
        </div>

        <div className="mt-4 bg-white rounded-xl shadow-sm border overflow-hidden">
          <button
            type="button"
            onClick={() => setShowDemo((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-600 hover:bg-gray-50"
          >
            <span className="font-medium">Demo accounts</span>
            {showDemo ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showDemo && (
            <div className="border-t divide-y">
              {DEMO_ACCOUNTS.map((a) => (
                <button
                  key={a.email}
                  type="button"
                  onClick={() => { setEmail(a.email); setPassword('Password1!'); setTenant(DEFAULT_TENANT); }}
                  className="w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-gray-50 text-left"
                >
                  <span className="text-gray-800">{a.email}</span>
                  <span className="text-xs text-gray-500 ml-2">{a.role}</span>
                </button>
              ))}
              <p className="px-4 py-2 text-xs text-gray-400">Workspace: <code className="font-mono">{DEFAULT_TENANT}</code> · Password: <code className="font-mono">Password1!</code></p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
