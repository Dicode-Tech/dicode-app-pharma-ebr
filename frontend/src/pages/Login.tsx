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

export function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDemo, setShowDemo] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch {
      setError('Invalid email or password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-3 mb-2">
            <FlaskConical className="h-10 w-10 text-primary-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dicode EBR</h1>
              <p className="text-xs text-gray-400">Electronic Batch Records</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            GMP Compliant · 21 CFR Part 11
          </span>
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl shadow-sm border p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Sign in to your account</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
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

        {/* Demo credentials */}
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
                  onClick={() => { setEmail(a.email); setPassword('Password1!'); }}
                  className="w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-gray-50 text-left"
                >
                  <span className="text-gray-800">{a.email}</span>
                  <span className="text-xs text-gray-500 ml-2">{a.role}</span>
                </button>
              ))}
              <p className="px-4 py-2 text-xs text-gray-400">Password: <code className="font-mono">Password1!</code></p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
