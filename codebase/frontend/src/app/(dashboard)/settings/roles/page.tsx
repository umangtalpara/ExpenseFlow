'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { Trash2, Plus, RefreshCw, ShieldCheck, Edit3, X, Check, AlertCircle } from 'lucide-react';

interface Role {
  _id: string;
  name: string;
  description?: string;
}

const emptyForm = {
  name: '',
  description: '',
};

export default function RolesSettingsPage() {
  const { user } = useAuthStore();
  const isAdmin =
    user?.role === 'Administrator' ||
    user?.role === 'Organization Admin' ||
    user?.role?.includes('Admin');

  const [items, setItems] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);

  const loadItems = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/roles');
      setItems(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load roles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.post('/roles', {
        name: form.name,
        description: form.description || undefined,
      });
      setItems((prev) => [...prev, res.data]);
      setForm(emptyForm);
      setSuccess('Role created successfully');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create role');
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (role: Role) => {
    setEditingId(role._id);
    setEditForm({ name: role.name, description: role.description || '' });
  };

  const handleUpdate = async (e: React.FormEvent, id: string) => {
    e.preventDefault();
    if (!isAdmin) return;
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.put(`/roles/${id}`, {
        name: editForm.name,
        description: editForm.description || undefined,
      });
      setItems((prev) => prev.map((item) => (item._id === id ? res.data : item)));
      setEditingId(null);
      setSuccess('Role updated successfully');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update role');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    if (!confirm('Delete this role? Employees assigned to this role will lose their assignment.')) return;
    setError('');
    setSuccess('');
    try {
      await api.delete(`/roles/${id}`);
      setItems((prev) => prev.filter((item) => item._id !== id));
      setSuccess('Role deleted');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete role');
    }
  };

  const inputClass =
    'mt-1.5 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-50';

  return (
    <div className="space-y-6 max-w-6xl animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Employee Roles</h1>
          <p className="text-sm text-slate-400 mt-1">
            Define organizational roles assigned to employees for access control and permissions.
          </p>
        </div>
        <button
          onClick={loadItems}
          title="Refresh"
          className="p-2 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-all"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Feedback */}
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create Form */}
        {isAdmin && (
          <div className="lg:col-span-1">
            <div className="rounded-xl border border-white/5 bg-[#0b0f19]/60 backdrop-blur-md p-5 shadow-lg space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20">
                  <ShieldCheck className="h-4 w-4 text-violet-400" />
                </div>
                <h3 className="text-sm font-semibold text-white">Add Role</h3>
              </div>

              <form onSubmit={handleCreate} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Role Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Finance Manager"
                    className={inputClass}
                    disabled={submitting}
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Description</label>
                  <input
                    type="text"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Optional description"
                    className={inputClass}
                    disabled={submitting}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-semibold transition-all text-sm disabled:opacity-50 shadow-lg shadow-cyan-500/20 mt-1"
                >
                  {submitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {submitting ? 'Creating...' : 'Create Role'}
                </button>
              </form>

              {/* Info box */}
              <div className="mt-2 p-3 rounded-lg bg-violet-500/5 border border-violet-500/20 text-xs text-slate-400 leading-relaxed">
                Roles created here will appear in the{' '}
                <span className="text-violet-400 font-medium">Invite Employee</span> and{' '}
                <span className="text-violet-400 font-medium">Edit Employee</span> dropdowns.
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className={isAdmin ? 'lg:col-span-2' : 'lg:col-span-3'}>
          <div className="rounded-xl border border-white/5 bg-[#0b0f19]/60 backdrop-blur-md overflow-hidden shadow-lg">
            {loading ? (
              <div className="p-12 text-center text-slate-400 text-sm">Loading roles...</div>
            ) : items.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-sm">
                No roles configured yet. Add your first one.
              </div>
            ) : (
              <table className="min-w-full divide-y divide-white/5">
                <thead className="bg-[#0c1020]">
                  <tr>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Role Name</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Description</th>
                    {isAdmin && (
                      <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {items.map((item) =>
                    editingId === item._id ? (
                      <tr key={item._id} className="bg-cyan-500/5">
                        <td className="px-5 py-3" colSpan={isAdmin ? 3 : 2}>
                          <form onSubmit={(e) => handleUpdate(e, item._id)} className="flex flex-wrap gap-2 items-end">
                            <div className="flex flex-col gap-1 min-w-[150px]">
                              <label className="text-[10px] uppercase tracking-wider text-slate-400">Name</label>
                              <input
                                type="text"
                                value={editForm.name}
                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                className="rounded-lg border border-cyan-500/30 bg-white/5 px-3 py-1.5 text-sm text-white focus:outline-none"
                                required
                              />
                            </div>
                            <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
                              <label className="text-[10px] uppercase tracking-wider text-slate-400">Description</label>
                              <input
                                type="text"
                                value={editForm.description}
                                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                placeholder="Optional"
                                className="rounded-lg border border-cyan-500/30 bg-white/5 px-3 py-1.5 text-sm text-white focus:outline-none"
                              />
                            </div>
                            <div className="flex gap-2 pb-0.5">
                              <button
                                type="submit"
                                disabled={submitting}
                                className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-colors"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingId(null)}
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 border border-white/10 transition-colors"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </form>
                        </td>
                      </tr>
                    ) : (
                      <tr key={item._id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                              <ShieldCheck className="h-3.5 w-3.5 text-violet-400" />
                            </div>
                            <span className="text-sm font-medium text-white">{item.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-400">
                          {item.description || <span className="text-slate-600 italic">No description</span>}
                        </td>
                        {isAdmin && (
                          <td className="px-5 py-4 whitespace-nowrap text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => startEdit(item)}
                                className="p-1.5 rounded-lg text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
                                title="Edit"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(item._id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
