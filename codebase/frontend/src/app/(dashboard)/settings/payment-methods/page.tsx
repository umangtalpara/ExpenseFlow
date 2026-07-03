'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { Trash2, Plus, RefreshCw, CreditCard, Edit3, X, Check, AlertCircle } from 'lucide-react';

interface PaymentMethod {
  _id: string;
  name: string;
  code: string;
  type: 'cash' | 'corporate_card' | 'personal_card' | 'other';
  status: 'active' | 'inactive';
}

const TYPE_LABELS: Record<string, string> = {
  cash: 'Cash',
  corporate_card: 'Corporate Card',
  personal_card: 'Personal Card',
  other: 'Other',
};

const TYPE_COLORS: Record<string, string> = {
  cash: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  corporate_card: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
  personal_card: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
  other: 'bg-slate-500/10 border-slate-500/20 text-slate-400',
};

const emptyForm = {
  name: '',
  code: '',
  type: 'cash' as PaymentMethod['type'],
  status: 'active' as 'active' | 'inactive',
};

export default function PaymentMethodsSettingsPage() {
  const { user } = useAuthStore();
  const isAdmin =
    user?.role === 'Administrator' ||
    user?.role === 'Organization Admin' ||
    user?.role?.includes('Admin');

  const [items, setItems] = useState<PaymentMethod[]>([]);
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
      const res = await api.get('/payment-methods');
      setItems(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load payment methods');
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
      const res = await api.post('/payment-methods', {
        name: form.name,
        code: form.code.toUpperCase(),
        type: form.type,
        status: form.status,
      });
      setItems((prev) => [...prev, res.data]);
      setForm(emptyForm);
      setSuccess('Payment method created successfully');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create payment method');
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (item: PaymentMethod) => {
    setEditingId(item._id);
    setEditForm({ name: item.name, code: item.code, type: item.type, status: item.status });
  };

  const handleUpdate = async (e: React.FormEvent, id: string) => {
    e.preventDefault();
    if (!isAdmin) return;
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.put(`/payment-methods/${id}`, {
        name: editForm.name,
        code: editForm.code.toUpperCase(),
        type: editForm.type,
        status: editForm.status,
      });
      setItems((prev) => prev.map((item) => (item._id === id ? res.data : item)));
      setEditingId(null);
      setSuccess('Payment method updated successfully');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update payment method');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    if (!confirm('Delete this payment method? This cannot be undone.')) return;
    setError('');
    setSuccess('');
    try {
      await api.delete(`/payment-methods/${id}`);
      setItems((prev) => prev.filter((item) => item._id !== id));
      setSuccess('Payment method deleted');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete payment method');
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
          <h1 className="text-2xl font-bold tracking-tight text-white">Payment Methods</h1>
          <p className="text-sm text-slate-400 mt-1">
            Configure accepted payment methods for expense submissions.
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
                <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <CreditCard className="h-4 w-4 text-blue-400" />
                </div>
                <h3 className="text-sm font-semibold text-white">Add Payment Method</h3>
              </div>

              <form onSubmit={handleCreate} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Company Visa Card"
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
                    placeholder="e.g. CORP_VISA"
                    className={`${inputClass} uppercase`}
                    disabled={submitting}
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Type *</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as PaymentMethod['type'] })}
                    className={selectClass}
                    disabled={submitting}
                    required
                  >
                    <option value="cash">Cash</option>
                    <option value="corporate_card">Corporate Card</option>
                    <option value="personal_card">Personal Card</option>
                    <option value="other">Other</option>
                  </select>
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

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-semibold transition-all text-sm disabled:opacity-50 shadow-lg shadow-cyan-500/20 mt-1"
                >
                  <Plus className="h-4 w-4" />
                  {submitting ? 'Creating...' : 'Create Method'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Table */}
        <div className={isAdmin ? 'lg:col-span-2' : 'lg:col-span-3'}>
          <div className="rounded-xl border border-white/5 bg-[#0b0f19]/60 backdrop-blur-md overflow-hidden shadow-lg">
            {loading ? (
              <div className="p-12 text-center text-slate-400 text-sm">Loading payment methods...</div>
            ) : items.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-sm">
                No payment methods configured yet. Add your first one.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-white/5">
                  <thead className="bg-[#0c1020]">
                    <tr>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Name</th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Code</th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Type</th>
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
                          <td className="px-5 py-3" colSpan={isAdmin ? 5 : 4}>
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
                              <div className="flex flex-col gap-1 min-w-[90px]">
                                <label className="text-[10px] uppercase tracking-wider text-slate-400">Code</label>
                                <input
                                  type="text"
                                  value={editForm.code}
                                  onChange={(e) => setEditForm({ ...editForm, code: e.target.value.toUpperCase() })}
                                  className="rounded-lg border border-cyan-500/30 bg-white/5 px-3 py-1.5 text-sm text-white uppercase focus:outline-none"
                                  required
                                />
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] uppercase tracking-wider text-slate-400">Type</label>
                                <select
                                  value={editForm.type}
                                  onChange={(e) => setEditForm({ ...editForm, type: e.target.value as PaymentMethod['type'] })}
                                  className="rounded-lg border border-cyan-500/30 bg-[#0c1020] px-3 py-1.5 text-sm text-white focus:outline-none"
                                >
                                  <option value="cash">Cash</option>
                                  <option value="corporate_card">Corporate Card</option>
                                  <option value="personal_card">Personal Card</option>
                                  <option value="other">Other</option>
                                </select>
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
                          <td className="px-5 py-4 text-sm font-medium text-white whitespace-nowrap">{item.name}</td>
                          <td className="px-5 py-4 text-sm font-mono text-cyan-400 whitespace-nowrap">{item.code}</td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${TYPE_COLORS[item.type] || TYPE_COLORS.other}`}>
                              {TYPE_LABELS[item.type] || item.type}
                            </span>
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
