import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FlaskConical, List, PlusCircle, Home, BookOpen, ShieldCheck, Radio, LogOut, Users } from 'lucide-react';
import { OfflineIndicator } from './OfflineIndicator';
import { useAuth } from '../context/AuthContext';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  batch_manager: 'Batch Manager',
  operator_supervisor: 'Supervisor',
  operator: 'Operator',
  qa_qc: 'QA/QC',
};

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { user, logout, hasRole } = useAuth();

  const navItems = [
    { path: '/', label: 'Dashboard', icon: Home },
    { path: '/batches', label: 'Batches', icon: List },
    { path: '/batches/new', label: 'New Batch', icon: PlusCircle },
    { path: '/recipes', label: 'Recipes', icon: BookOpen },
    { path: '/integrations', label: 'Integrations', icon: Radio },
    { path: '/audit', label: 'Audit Trail', icon: ShieldCheck },
  ];

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <div className="min-h-screen bg-gray-50">
      <OfflineIndicator />

      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <FlaskConical className="h-8 w-8 text-primary-600 mr-3" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Dicode EBR</h1>
                <p className="text-xs text-gray-400 -mt-0.5">Electronic Batch Records</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                GMP Compliant · 21 CFR Part 11
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-56 bg-white shadow-sm min-h-screen border-r flex-shrink-0 flex flex-col">
          <nav className="mt-4 px-2 space-y-0.5 flex-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg ${
                    active
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className={`mr-3 h-4 w-4 flex-shrink-0 ${active ? 'text-primary-700' : 'text-gray-400 group-hover:text-gray-500'}`} />
                  {item.label}
                </Link>
              );
            })}

            {hasRole('admin') && (
              <Link
                to="/admin"
                className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg ${
                  isActive('/admin')
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Users className={`mr-3 h-4 w-4 flex-shrink-0 ${isActive('/admin') ? 'text-primary-700' : 'text-gray-400 group-hover:text-gray-500'}`} />
                Admin Panel
              </Link>
            )}
          </nav>

          {/* User footer */}
          <div className="px-3 py-4 border-t">
            {user && (
              <div className="space-y-2">
                <div>
                  <p className="text-xs font-semibold text-gray-800 truncate">{user.full_name}</p>
                  <p className="text-xs text-gray-400">{ROLE_LABELS[user.role] ?? user.role}</p>
                </div>
                <button
                  onClick={logout}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-600 transition-colors w-full"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign out
                </button>
              </div>
            )}
            <div className="text-xs text-gray-400 mt-3">
              Dicode EBR v1.0.0
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 min-w-0">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
