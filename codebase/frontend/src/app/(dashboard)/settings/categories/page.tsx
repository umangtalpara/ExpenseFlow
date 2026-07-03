'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { Trash2, Plus, RefreshCw, Tag, Edit3, X, Check, AlertCircle } from 'lucide-react';

interface Category {
  _id: string;
  name: string;
  code: string;
  description?: string;
  status: 'active' | 'inactive';
  requireReceipt: boolean;
  maxLimit?: number;
}

const emptyForm = {
  name: '',
  code: '',
  description: '',
  status: 'active' as 'active' | 'inactive',
  requireReceipt: false,
  maxLimit: '',
};

export default function CategoriesSettingsPage() {
  const { user } = useAuthStore();
  const isAdmin =
    user?.role === 'Administrator' ||
    user?.role === 'Organization Admin' ||
    user?.role?.includes('Admin');

  const [items, setItems] = useState<Category[]>([]);
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
      const res = await api.get('/categories');
      setItems(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load categories');
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
      const payload: any = {
        name: form.name,
        code: form.code.toUpperCase(),
        description: form.description || undefined,
        status: form.status,
        requireReceipt: form.requireReceipt,
      };
      if (form.maxLimit !== '') payload.maxLimit = Number(form.maxLimit);
      const res = await api.post('/categories', payload);
      setItems((prev) => [...prev, res.data]);
      setForm(emptyForm);
      setSuccess('Category created successfully');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create category');
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat._id);
    setEditForm({
      name: cat.name,
      code: cat.code,
      description: cat.description || '',
      status: cat.status,
      requireReceipt: cat.requireReceipt,
      maxLimit: cat.maxLimit !== undefined ? String(cat.maxLimit) : '',
    });
  };

  const handleUpdate = async (e: React.FormEvent, id: string) => {
    e.preventDefault();
    if (!isAdmin) return;
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const payload: any = {
        name: editForm.name,
        code: editForm.code.toUpperCase(),
        description: editForm.description || undefined,
        status: editForm.status,
        requireReceipt: editForm.requireReceipt,
      };
      if (editForm.maxLimit !== '') payload.maxLimit = Number(editForm.maxLimit);
      const res = await api.put(`/categories/${id}`, payload);
      setItems((prev) => prev.map((item) => (item._id === id ? res.data : item)));
      setEditingId(null);
      setSuccess('Category updated successfully');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    if (!confirm('Delete this category? This cannot be undone.')) return;
    setError('');
    setSuccess('');
    try {
      await api.delete(`/categories/${id}`);
      setItems((prev) => prev.filter((item) => item._id !== id));
      setSuccess('Category deleted');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete category');
    }
  };

  const inputClass =
    'mt-1.5 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-50';
  const selectClass =
    'mt-1.5 w-full rounded-lg border border-white/10 bg-[#0c1020] px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-50';

  return (
    <div className="space-y-6 max-w-6xl animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Expense Categories</h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage expense categories, spending limits and receipt requirements.
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
                <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                  <Tag className="h-4 w-4 text-cyan-400" />
                </div>
                <h3 className="text-sm font-semibold text-white">Add Category</h3>
              </div>

              <form onSubmit={handleCreate} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Travel & Hotels"
                    className={inputClass}
                    disabled={submitting}
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Code *</label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. TRAVEL"
                    className={`${inputClass} uppercase`}
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

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Max Limit ($)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.maxLimit}
                    onChange={(e) => setForm({ ...form, maxLimit: e.target.value })}
                    placeholder="No limit"
                    className={inputClass}
                    disabled={submitting}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as 'active' | 'inactive' })}
                    className={selectClass}
                    disabled={submitting}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <input
                    id="requireReceipt"
                    type="checkbox"
                    checked={form.requireReceipt}
                    onChange={(e) => setForm({ ...form, requireReceipt: e.target.checked })}
                    disabled={submitting}
                    className="h-4 w-4 rounded border-white/20 bg-white/5 text-cyan-500 focus:ring-cyan-500"
                  />
                  <label htmlFor="requireReceipt" className="text-xs text-slate-300 cursor-pointer">
                    Require receipt upload
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-semibold transition-all text-sm disabled:opacity-50 shadow-lg shadow-cyan-500/20 mt-1"
                >
                  <Plus className="h-4 w-4" />
                  {submitting ? 'Creating...' : 'Create Category'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Table */}
        <div className={isAdmin ? 'lg:col-span-2' : 'lg:col-span-3'}>
          <div className="rounded-xl border border-white/5 bg-[#0b0f19]/60 backdrop-blur-md overflow-hidden shadow-lg">
            {loading ? (
              <div className="p-12 text-center text-slate-400 text-sm">Loading categories...</div>
            ) : items.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-sm">
                No categories configured yet. Add your first one.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-white/5">
                  <thead className="bg-[#0c1020]">
                    <tr>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Name</th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Code</th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Max Limit</th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Receipt</th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Status</th>
                      {isAdmin && (
                        <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {items.map((item) =>
                      editingId === item._id ? (
                        <tr key={item._id} className="bg-cyan-500/5">
                          <td className="px-5 py-3" colSpan={isAdmin ? 6 : 5}>
                            <form onSubmit={(e) => handleUpdate(e, item._id)} className="flex flex-wrap gap-2 items-end">
                              <div className="flex flex-col gap-1 min-w-[120px]">
                                <label className="text-[10px] uppercase tracking-wider text-slate-400">Name</label>
                                <input
                                  type="text"
                                  value={editForm.name}
                                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                  className="rounded-lg border border-cyan-500/30 bg-white/5 px-3 py-1.5 text-sm text-white focus:outline-none"
                                  required
                                />
                              </div>
                              <div className="flex flex-col gap-1 min-w-[80px]">
                                <label className="text-[10px] uppercase tracking-wider text-slate-400">Code</label>
                                <input
                                  type="text"
                                  value={editForm.code}
                                  onChange={(e) => setEditForm({ ...editForm, code: e.target.value.toUpperCase() })}
                                  className="rounded-lg border border-cyan-500/30 bg-white/5 px-3 py-1.5 text-sm text-white uppercase focus:outline-none"
                                  required
                                />
                              </div>
                              <div className="flex flex-col gap-1 min-w-[80px]">
                                <label className="text-[10px] uppercase tracking-wider text-slate-400">Max Limit</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={editForm.maxLimit}
                                  onChange={(e) => setEditForm({ ...editForm, maxLimit: e.target.value })}
                                  placeholder="—"
                                  className="rounded-lg border border-cyan-500/30 bg-white/5 px-3 py-1.5 text-sm text-white focus:outline-none"
                                />
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] uppercase tracking-wider text-slate-400">Status</label>
                                <select
                                  value={editForm.status}
                                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value as 'active' | 'inactive' })}
                                  className="rounded-lg border border-cyan-500/30 bg-[#0c1020] px-3 py-1.5 text-sm text-white focus:outline-none"
                                >
                                  <option value="active">Active</option>
                                  <option value="inactive">Inactive</option>
                                </select>
                              </div>
                              <div className="flex items-center gap-2 pb-0.5">
                                <input
                                  id={`req-receipt-edit-${item._id}`}
                                  type="checkbox"
                                  checked={editForm.requireReceipt}
                                  onChange={(e) => setEditForm({ ...editForm, requireReceipt: e.target.checked })}
                                  className="h-4 w-4 rounded border-white/20 text-cyan-500"
                                />
                                <label htmlFor={`req-receipt-edit-${item._id}`} className="text-xs text-slate-400">Receipt</label>
                              </div>
                              <div className="flex gap-2 ml-auto pb-0.5">
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
                          <td className="px-5 py-4">
                            <div>
                              <p className="text-sm font-medium text-white">{item.name}</p>
                              {item.description && (
                                <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4 text-sm font-mono text-cyan-400 whitespace-nowrap">{item.code}</td>
                          <td className="px-5 py-4 text-sm text-slate-300 whitespace-nowrap">
                            {item.maxLimit ? `$${item.maxLimit.toLocaleString()}` : <span className="text-slate-600">—</span>}
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            {item.requireReceipt ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-400">
                                <Check className="h-3 w-3" /> Required
                              </span>
                            ) : (
                              <span className="text-xs text-slate-600">Optional</span>
                            )}
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                                item.status === 'active'
                                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                                  : 'bg-slate-500/10 border border-slate-500/20 text-slate-400'
                              }`}
                            >
                              {item.status}
                            </span>
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
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
