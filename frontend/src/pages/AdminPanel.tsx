import { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { userService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { UserRecord, UserRole } from '../types';
import { UserPlus, Pencil, Trash2, X, Check, Users, ShieldCheck } from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

type AdminTab = 'users' | 'roles';

const TABS: { id: AdminTab; label: string; icon: typeof Users }[] = [
  { id: 'users', label: 'Users', icon: Users },
  { id: 'roles', label: 'Roles', icon: ShieldCheck },
];

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'batch_manager', label: 'Batch Manager' },
  { value: 'operator_supervisor', label: 'Operator Supervisor' },
  { value: 'operator', label: 'Operator' },
  { value: 'qa_qc', label: 'QA/QC' },
];

const ROLE_VARIANT: Record<UserRole, 'danger' | 'info' | 'default' | 'success'> = {
  admin: 'danger',
  batch_manager: 'info',
  operator_supervisor: 'info',
  operator: 'default',
  qa_qc: 'success',
};

// ─── Permission matrix ────────────────────────────────────────────────────────

type PermRow = {
  label: string;
  group?: true;
  perms?: boolean[];
};

const PERMISSION_MATRIX: PermRow[] = [
  // columns: Admin | Batch Mgr | Op. Supervisor | Operator | QA/QC
  { label: 'User Management', group: true },
  { label: 'Manage users (view, create, edit, deactivate)', perms: [true, false, false, false, false] },

  { label: 'Batches', group: true },
  { label: 'View batches & steps',                          perms: [true, true,  true,  true,  true]  },
  { label: 'Create batch',                                   perms: [true, true,  true,  true,  false] },
  { label: 'Start / Complete / Cancel batch',                perms: [true, true,  true,  false, false] },
  { label: 'Update & sign steps',                            perms: [true, true,  true,  true,  false] },
  { label: 'Generate PDF report',                            perms: [true, true,  true,  false, false] },
  { label: 'Download PDF report',                            perms: [true, true,  true,  true,  true]  },

  { label: 'Recipes', group: true },
  { label: 'View recipes',                                   perms: [true, true,  true,  true,  true]  },
  { label: 'Create / Edit / Delete recipes',                 perms: [true, true,  false, false, false] },

  { label: 'Integrations & Audit Trail', group: true },
  { label: 'View OPC-UA data & audit logs',                  perms: [true, true,  true,  true,  true]  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function RolesTab() {
  const cols = ROLES.map((r) => r.label);
  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase w-64">Permission</th>
              {cols.map((c) => (
                <th key={c} className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSION_MATRIX.map((row, i) =>
              row.group ? (
                <tr key={i} className="bg-gray-50 border-t border-b">
                  <td colSpan={ROLES.length + 1} className="px-5 py-2 text-xs font-bold text-gray-600 uppercase tracking-wide">
                    {row.label}
                  </td>
                </tr>
              ) : (
                <tr key={i} className="border-b hover:bg-gray-50">
                  <td className="px-5 py-3 text-sm text-gray-700 pl-7">{row.label}</td>
                  {row.perms!.map((allowed, j) => (
                    <td key={j} className="px-4 py-3 text-center">
                      {allowed
                        ? <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-600"><Check className="w-3.5 h-3.5" /></span>
                        : <span className="text-gray-300 text-lg leading-none">—</span>}
                    </td>
                  ))}
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
      <div className="px-5 py-3 bg-gray-50 border-t text-xs text-gray-400">
        Permissions are enforced server-side. To change a user's access level, update their role in the Users tab.
      </div>
    </div>
  );
}

// ─── Modal form state ─────────────────────────────────────────────────────────

type ModalMode = 'create' | 'edit' | null;

interface FormState {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
}

const EMPTY_FORM: FormState = {
  email: '',
  password: '',
  full_name: '',
  role: 'operator',
  is_active: true,
};

// ─── Main component ───────────────────────────────────────────────────────────

export function AdminPanel() {
  const { user: me } = useAuth();
  const [tab, setTab] = useState<AdminTab>('users');
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editTarget, setEditTarget] = useState<UserRecord | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    try {
      setUsers(await userService.getAllUsers());
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setForm(EMPTY_FORM);
    setFormError('');
    setEditTarget(null);
    setModalMode('create');
  }

  function openEdit(u: UserRecord) {
    setForm({ email: u.email, password: '', full_name: u.full_name, role: u.role, is_active: u.is_active });
    setFormError('');
    setEditTarget(u);
    setModalMode('edit');
  }

  function closeModal() {
    setModalMode(null);
    setEditTarget(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      if (modalMode === 'create') {
        await userService.createUser({
          email: form.email,
          password: form.password,
          full_name: form.full_name,
          role: form.role,
        });
      } else if (editTarget) {
        const update: Parameters<typeof userService.updateUser>[1] = {
          full_name: form.full_name,
          role: form.role,
          is_active: form.is_active,
        };
        if (form.password) update.password = form.password;
        await userService.updateUser(editTarget.id, update);
      }
      closeModal();
      await loadUsers();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setFormError(axiosErr.response?.data?.error || 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(u: UserRecord) {
    if (!confirm(`Deactivate ${u.full_name}? They will no longer be able to log in.`)) return;
    await userService.deleteUser(u.id);
    await loadUsers();
  }

  const inputClass = 'w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent';
  const labelClass = 'block text-xs font-medium text-gray-700 mb-1';

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Administration</h2>
            <p className="text-sm text-gray-500 mt-0.5">Manage users, roles, and system configuration</p>
          </div>
          {tab === 'users' && (
            <Button onClick={openCreate}>
              <UserPlus className="w-4 h-4 mr-2" />Add User
            </Button>
          )}
        </div>

        {/* Tab bar */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex gap-6">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex items-center gap-2 pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                  tab === id
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

        {/* Users tab */}
        {tab === 'users' && (
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-gray-400">Loading…</div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {['Name', 'Email', 'Role', 'Status', 'Created', 'Actions'].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {users.map((u) => (
                    <tr key={u.id} className={u.is_active ? 'hover:bg-gray-50' : 'bg-gray-50 opacity-60'}>
                      <td className="px-5 py-3 text-sm font-medium text-gray-900">
                        {u.full_name}
                        {u.id === me?.id && <span className="ml-1 text-xs text-gray-400">(you)</span>}
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-500">{u.email}</td>
                      <td className="px-5 py-3">
                        <Badge variant={ROLE_VARIANT[u.role]}>{ROLES.find((r) => r.value === u.role)?.label ?? u.role}</Badge>
                      </td>
                      <td className="px-5 py-3">
                        {u.is_active
                          ? <span className="inline-flex items-center gap-1 text-xs text-green-700"><Check className="w-3 h-3" />Active</span>
                          : <span className="inline-flex items-center gap-1 text-xs text-gray-400"><X className="w-3 h-3" />Inactive</span>}
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-400">{new Date(u.created_at).toLocaleDateString()}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEdit(u)}
                            className="text-gray-400 hover:text-primary-600 transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          {u.id !== me?.id && (
                            <button
                              onClick={() => handleDelete(u)}
                              className="text-gray-400 hover:text-red-600 transition-colors"
                              title="Deactivate"
                            >
                              <Trash2 className="w-4 h-4" />
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
        )}

        {/* Roles tab */}
        {tab === 'roles' && <RolesTab />}
      </div>

      {/* Modal */}
      {modalMode && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-semibold text-gray-900">
                {modalMode === 'create' ? 'Add User' : `Edit — ${editTarget?.full_name}`}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{formError}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={labelClass}>Full Name *</label>
                <input
                  type="text" required className={inputClass}
                  value={form.full_name}
                  onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                />
              </div>

              {modalMode === 'create' && (
                <div>
                  <label className={labelClass}>Email *</label>
                  <input
                    type="email" required className={inputClass}
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  />
                </div>
              )}

              <div>
                <label className={labelClass}>
                  {modalMode === 'create' ? 'Password *' : 'New Password (leave blank to keep current)'}
                </label>
                <input
                  type="password"
                  required={modalMode === 'create'}
                  minLength={6}
                  className={inputClass}
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder={modalMode === 'edit' ? '(unchanged)' : ''}
                />
              </div>

              <div>
                <label className={labelClass}>Role *</label>
                <select
                  required className={inputClass}
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole }))}
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              {modalMode === 'edit' && editTarget?.id !== me?.id && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox" id="is_active"
                    checked={form.is_active}
                    onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <label htmlFor="is_active" className="text-sm text-gray-700">Active account</label>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={closeModal} className="flex-1">Cancel</Button>
                <Button type="submit" disabled={submitting} className="flex-1">
                  {submitting ? 'Saving…' : modalMode === 'create' ? 'Create User' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
