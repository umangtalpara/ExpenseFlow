'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import {
  Building2,
  Save,
  Globe,
  MapPin,
  Tag,
  CreditCard,
  ShieldCheck,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

type Tab = 'profile' | 'categories' | 'payment-methods' | 'roles';

interface Category {
  _id: string;
  name: string;
  code: string;
  description?: string;
  status: 'active' | 'inactive';
  requireReceipt: boolean;
  maxLimit?: number;
}

interface PaymentMethod {
  _id: string;
  name: string;
  code: string;
  type: 'cash' | 'corporate_card' | 'personal_card' | 'other';
  status: 'active' | 'inactive';
}

interface Role {
  _id: string;
  name: string;
  description?: string;
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

const inputCls =
  'mt-1.5 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-50';
const selectCls =
  'mt-1.5 w-full rounded-lg border border-white/10 bg-[#0c1020] px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-50';

const PM_TYPE_LABELS: Record<string, string> = {
  cash: 'Cash',
  corporate_card: 'Corporate Card',
  personal_card: 'Personal Card',
  other: 'Other',
};
const PM_TYPE_COLORS: Record<string, string> = {
  cash: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  corporate_card: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
  personal_card: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
  other: 'bg-slate-500/10 border-slate-500/20 text-slate-400',
};

function FeedbackBanner({ error, success }: { error: string; success: string }) {
  return (
    <>
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
    </>
  );
}

// ─── Tab: Organization Profile ────────────────────────────────────────────────

function ProfileTab({ isAdmin }: { isAdmin: boolean }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    name: '', slug: '', website: '', address: '', currency: 'USD', timezone: 'UTC',
  });

  useEffect(() => {
    api.get('/organizations/profile')
      .then((r) => setForm({
        name: r.data.name || '',
        slug: r.data.slug || '',
        website: r.data.website || '',
        address: r.data.address || '',
        currency: r.data.currency || 'USD',
        timezone: r.data.timezone || 'UTC',
      }))
      .catch((err: any) => setError(err.response?.data?.message || 'Failed to load organization profile'))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      const r = await api.patch('/organizations/profile', {
        name: form.name, website: form.website, address: form.address,
        currency: form.currency, timezone: form.timezone,
      });
      setSuccess('Organization profile updated successfully');
      setForm((p) => ({ ...p, name: r.data.name }));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update organization profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="py-16 text-center text-sm text-slate-400">Loading profile settings...</div>;

  return (
    <div className="space-y-5">
      <FeedbackBanner error={error} success={success} />
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-semibold text-slate-300">Organization Name</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              disabled={!isAdmin || saving} placeholder="Acme Corp" required
              className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-50" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-300">Organization Slug <span className="text-slate-600 font-normal">(read-only)</span></label>
            <input type="text" value={form.slug} disabled
              className="mt-2 w-full rounded-lg border border-white/5 bg-[#070911] px-4 py-2.5 text-sm text-slate-500 cursor-not-allowed" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-300">Website URL</label>
            <div className="relative mt-2">
              <Globe className="pointer-events-none absolute inset-y-0 left-3 my-auto h-4 w-4 text-slate-500" />
              <input type="url" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })}
                disabled={!isAdmin || saving} placeholder="https://acme.com"
                className="w-full rounded-lg border border-white/10 bg-white/5 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-50" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-300">Default Currency</label>
            <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}
              disabled={!isAdmin || saving}
              className="mt-2 w-full rounded-lg border border-white/10 bg-[#0c1020] px-4 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-50">
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="INR">INR (₹)</option>
              <option value="CAD">CAD ($)</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-slate-300">Office Address</label>
            <div className="relative mt-2">
              <MapPin className="pointer-events-none absolute inset-y-0 left-3 my-auto h-4 w-4 text-slate-500" />
              <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
                disabled={!isAdmin || saving} placeholder="123 Corporate Blvd, Suite 100"
                className="w-full rounded-lg border border-white/10 bg-white/5 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-50" />
            </div>
          </div>
        </div>

        {isAdmin ? (
          <div className="flex justify-end pt-2">
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-semibold transition-all text-sm disabled:opacity-50 shadow-lg shadow-cyan-500/25">
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        ) : (
          <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm">
            You do not have administrative permissions to modify organization settings.
          </div>
        )}
      </form>
    </div>
  );
}

// ─── Tab: Expense Categories ──────────────────────────────────────────────────

const catEmpty = { name: '', code: '', description: '', status: 'active' as 'active' | 'inactive', requireReceipt: false, maxLimit: '' };

function CategoriesTab({ isAdmin }: { isAdmin: boolean }) {
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState(catEmpty);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(catEmpty);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setItems((await api.get('/categories')).data); }
    catch (err: any) { setError(err.response?.data?.message || 'Failed to load categories'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const buildPayload = (f: typeof catEmpty) => {
    const p: any = { name: f.name, code: f.code.toUpperCase(), status: f.status, requireReceipt: f.requireReceipt };
    if (f.description) p.description = f.description;
    if (f.maxLimit !== '') p.maxLimit = Number(f.maxLimit);
    return p;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); if (!isAdmin) return;
    setSubmitting(true); setError(''); setSuccess('');
    try {
      const r = await api.post('/categories', buildPayload(form));
      setItems((p) => [...p, r.data]); setForm(catEmpty); setSuccess('Category created');
    } catch (err: any) { setError(err.response?.data?.message || 'Failed to create category'); }
    finally { setSubmitting(false); }
  };

  const handleUpdate = async (e: React.FormEvent, id: string) => {
    e.preventDefault(); if (!isAdmin) return;
    setSubmitting(true); setError(''); setSuccess('');
    try {
      const r = await api.put(`/categories/${id}`, buildPayload(editForm));
      setItems((p) => p.map((i) => (i._id === id ? r.data : i))); setEditingId(null); setSuccess('Category updated');
    } catch (err: any) { setError(err.response?.data?.message || 'Failed to update category'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin || !confirm('Delete this category?')) return;
    setError(''); setSuccess('');
    try { await api.delete(`/categories/${id}`); setItems((p) => p.filter((i) => i._id !== id)); setSuccess('Category deleted'); }
    catch (err: any) { setError(err.response?.data?.message || 'Failed to delete category'); }
  };

  return (
    <div className="space-y-5">
      <FeedbackBanner error={error} success={success} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Form Panel */}
        {isAdmin && (
          <div className="lg:col-span-1">
            <div className="rounded-xl border border-white/5 bg-[#0b0f19]/60 p-5 space-y-3 shadow-lg">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20"><Tag className="h-3.5 w-3.5 text-cyan-400" /></div>
                <span className="text-sm font-semibold text-white">Add Category</span>
              </div>
              <form onSubmit={handleCreate} className="space-y-3">
                <div><label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Name *</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Travel & Hotels" className={inputCls} disabled={submitting} required /></div>
                <div><label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Code *</label>
                  <input type="text" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="TRAVEL" className={`${inputCls} uppercase`} disabled={submitting} required /></div>
                <div><label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Description</label>
                  <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional" className={inputCls} disabled={submitting} /></div>
                <div><label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Max Limit ($)</label>
                  <input type="number" min="0" value={form.maxLimit} onChange={(e) => setForm({ ...form, maxLimit: e.target.value })} placeholder="No limit" className={inputCls} disabled={submitting} /></div>
                <div><label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as 'active' | 'inactive' })} className={selectCls} disabled={submitting}>
                    <option value="active">Active</option><option value="inactive">Inactive</option>
                  </select></div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.requireReceipt} onChange={(e) => setForm({ ...form, requireReceipt: e.target.checked })} disabled={submitting} className="h-4 w-4 rounded border-white/20 bg-white/5 text-cyan-500" />
                  <span className="text-xs text-slate-300">Require receipt upload</span>
                </label>
                <button type="submit" disabled={submitting} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-semibold text-sm disabled:opacity-50 shadow-lg shadow-cyan-500/20 transition-all">
                  <Plus className="h-4 w-4" />{submitting ? 'Creating...' : 'Create Category'}
                </button>
              </form>
            </div>
          </div>
        )}
        {/* Table */}
        <div className={isAdmin ? 'lg:col-span-2' : 'lg:col-span-3'}>
          <div className="rounded-xl border border-white/5 bg-[#0b0f19]/60 overflow-hidden shadow-lg">
            <div className="flex items-center justify-between px-5 py-3.5 bg-[#0c1020] border-b border-white/5">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">All Categories</span>
              <button onClick={load} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"><RefreshCw className="h-3.5 w-3.5" /></button>
            </div>
            {loading ? (
              <div className="p-10 text-center text-sm text-slate-500">Loading...</div>
            ) : items.length === 0 ? (
              <div className="p-10 text-center text-sm text-slate-600">No categories yet. Add one →</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-white/5">
                  <thead><tr>
                    {['Name', 'Code', 'Max $', 'Receipt', 'Status', ...(isAdmin ? [''] : [])].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody className="divide-y divide-white/5">
                    {items.map((item) =>
                      editingId === item._id ? (
                        <tr key={item._id} className="bg-cyan-500/5">
                          <td colSpan={isAdmin ? 6 : 5} className="px-4 py-3">
                            <form onSubmit={(e) => handleUpdate(e, item._id)} className="flex flex-wrap gap-2 items-end">
                              {[
                                { label: 'Name', key: 'name', type: 'text', className: 'min-w-[110px]' },
                                { label: 'Code', key: 'code', type: 'text', className: 'min-w-[70px] uppercase' },
                                { label: 'Max $', key: 'maxLimit', type: 'number', className: 'min-w-[70px]' },
                              ].map(({ label, key, type, className }) => (
                                <div key={key} className={`flex flex-col gap-0.5 ${className}`}>
                                  <label className="text-[10px] uppercase tracking-wider text-slate-500">{label}</label>
                                  <input type={type} min={type === 'number' ? 0 : undefined}
                                    value={(editForm as any)[key]}
                                    onChange={(e) => setEditForm({ ...editForm, [key]: key === 'code' ? e.target.value.toUpperCase() : e.target.value })}
                                    className="rounded-lg border border-cyan-500/30 bg-white/5 px-2.5 py-1.5 text-sm text-white focus:outline-none"
                                    required={key !== 'maxLimit'} />
                                </div>
                              ))}
                              <div className="flex flex-col gap-0.5">
                                <label className="text-[10px] uppercase tracking-wider text-slate-500">Status</label>
                                <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value as 'active' | 'inactive' })}
                                  className="rounded-lg border border-cyan-500/30 bg-[#0c1020] px-2.5 py-1.5 text-sm text-white focus:outline-none">
                                  <option value="active">Active</option><option value="inactive">Inactive</option>
                                </select>
                              </div>
                              <label className="flex items-center gap-1.5 pb-1 cursor-pointer">
                                <input type="checkbox" checked={editForm.requireReceipt} onChange={(e) => setEditForm({ ...editForm, requireReceipt: e.target.checked })} className="h-4 w-4 rounded" />
                                <span className="text-xs text-slate-400">Receipt</span>
                              </label>
                              <div className="flex gap-2 ml-auto pb-0.5">
                                <button type="submit" disabled={submitting} className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"><Check className="h-4 w-4" /></button>
                                <button type="button" onClick={() => setEditingId(null)} className="p-1.5 rounded-lg bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10"><X className="h-4 w-4" /></button>
                              </div>
                            </form>
                          </td>
                        </tr>
                      ) : (
                        <tr key={item._id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 py-3.5">
                            <p className="text-sm font-medium text-white">{item.name}</p>
                            {item.description && <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>}
                          </td>
                          <td className="px-4 py-3.5 font-mono text-xs text-cyan-400">{item.code}</td>
                          <td className="px-4 py-3.5 text-sm text-slate-300">{item.maxLimit ? `$${item.maxLimit.toLocaleString()}` : <span className="text-slate-600">—</span>}</td>
                          <td className="px-4 py-3.5">
                            {item.requireReceipt
                              ? <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-400">Required</span>
                              : <span className="text-xs text-slate-600">Optional</span>}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase ${item.status === 'active' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-slate-500/10 border border-slate-500/20 text-slate-500'}`}>{item.status}</span>
                          </td>
                          {isAdmin && (
                            <td className="px-4 py-3.5 text-right">
                              <div className="flex justify-end gap-1.5">
                                <button onClick={() => { setEditingId(item._id); setEditForm({ name: item.name, code: item.code, description: item.description || '', status: item.status, requireReceipt: item.requireReceipt, maxLimit: item.maxLimit !== undefined ? String(item.maxLimit) : '' }); }} className="p-1.5 rounded-lg text-slate-400 hover:bg-white/5 hover:text-white transition-colors"><Edit3 className="h-3.5 w-3.5" /></button>
                                <button onClick={() => handleDelete(item._id)} className="p-1.5 rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
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

// ─── Tab: Payment Methods ─────────────────────────────────────────────────────

const pmEmpty = { name: '', code: '', type: 'cash' as PaymentMethod['type'], status: 'active' as 'active' | 'inactive' };

function PaymentMethodsTab({ isAdmin }: { isAdmin: boolean }) {
  const [items, setItems] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState(pmEmpty);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(pmEmpty);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setItems((await api.get('/payment-methods')).data); }
    catch (err: any) { setError(err.response?.data?.message || 'Failed to load payment methods'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); if (!isAdmin) return;
    setSubmitting(true); setError(''); setSuccess('');
    try {
      const r = await api.post('/payment-methods', { ...form, code: form.code.toUpperCase() });
      setItems((p) => [...p, r.data]); setForm(pmEmpty); setSuccess('Payment method created');
    } catch (err: any) { setError(err.response?.data?.message || 'Failed to create payment method'); }
    finally { setSubmitting(false); }
  };

  const handleUpdate = async (e: React.FormEvent, id: string) => {
    e.preventDefault(); if (!isAdmin) return;
    setSubmitting(true); setError(''); setSuccess('');
    try {
      const r = await api.put(`/payment-methods/${id}`, { ...editForm, code: editForm.code.toUpperCase() });
      setItems((p) => p.map((i) => (i._id === id ? r.data : i))); setEditingId(null); setSuccess('Payment method updated');
    } catch (err: any) { setError(err.response?.data?.message || 'Failed to update payment method'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin || !confirm('Delete this payment method?')) return;
    setError(''); setSuccess('');
    try { await api.delete(`/payment-methods/${id}`); setItems((p) => p.filter((i) => i._id !== id)); setSuccess('Payment method deleted'); }
    catch (err: any) { setError(err.response?.data?.message || 'Failed to delete payment method'); }
  };

  const TypeSelect = ({ value, onChange }: { value: string; onChange: (v: PaymentMethod['type']) => void }) => (
    <select value={value} onChange={(e) => onChange(e.target.value as PaymentMethod['type'])}
      className="rounded-lg border border-cyan-500/30 bg-[#0c1020] px-2.5 py-1.5 text-sm text-white focus:outline-none">
      <option value="cash">Cash</option>
      <option value="corporate_card">Corporate Card</option>
      <option value="personal_card">Personal Card</option>
      <option value="other">Other</option>
    </select>
  );

  return (
    <div className="space-y-5">
      <FeedbackBanner error={error} success={success} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {isAdmin && (
          <div className="lg:col-span-1">
            <div className="rounded-xl border border-white/5 bg-[#0b0f19]/60 p-5 space-y-3 shadow-lg">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20"><CreditCard className="h-3.5 w-3.5 text-blue-400" /></div>
                <span className="text-sm font-semibold text-white">Add Payment Method</span>
              </div>
              <form onSubmit={handleCreate} className="space-y-3">
                <div><label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Name *</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Company Visa Card" className={inputCls} disabled={submitting} required /></div>
                <div><label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Code *</label>
                  <input type="text" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="CORP_VISA" className={`${inputCls} uppercase`} disabled={submitting} required /></div>
                <div><label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Type *</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as PaymentMethod['type'] })} className={selectCls} disabled={submitting} required>
                    <option value="cash">Cash</option><option value="corporate_card">Corporate Card</option>
                    <option value="personal_card">Personal Card</option><option value="other">Other</option>
                  </select></div>
                <div><label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as 'active' | 'inactive' })} className={selectCls} disabled={submitting}>
                    <option value="active">Active</option><option value="inactive">Inactive</option>
                  </select></div>
                <button type="submit" disabled={submitting} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-semibold text-sm disabled:opacity-50 shadow-lg shadow-cyan-500/20 transition-all">
                  <Plus className="h-4 w-4" />{submitting ? 'Creating...' : 'Create Method'}
                </button>
              </form>
            </div>
          </div>
        )}
        <div className={isAdmin ? 'lg:col-span-2' : 'lg:col-span-3'}>
          <div className="rounded-xl border border-white/5 bg-[#0b0f19]/60 overflow-hidden shadow-lg">
            <div className="flex items-center justify-between px-5 py-3.5 bg-[#0c1020] border-b border-white/5">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">All Payment Methods</span>
              <button onClick={load} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"><RefreshCw className="h-3.5 w-3.5" /></button>
            </div>
            {loading ? (
              <div className="p-10 text-center text-sm text-slate-500">Loading...</div>
            ) : items.length === 0 ? (
              <div className="p-10 text-center text-sm text-slate-600">No payment methods yet. Add one →</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-white/5">
                  <thead><tr>
                    {['Name', 'Code', 'Type', 'Status', ...(isAdmin ? [''] : [])].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody className="divide-y divide-white/5">
                    {items.map((item) =>
                      editingId === item._id ? (
                        <tr key={item._id} className="bg-cyan-500/5">
                          <td colSpan={isAdmin ? 5 : 4} className="px-4 py-3">
                            <form onSubmit={(e) => handleUpdate(e, item._id)} className="flex flex-wrap gap-2 items-end">
                              <div className="flex flex-col gap-0.5 min-w-[110px]">
                                <label className="text-[10px] uppercase tracking-wider text-slate-500">Name</label>
                                <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="rounded-lg border border-cyan-500/30 bg-white/5 px-2.5 py-1.5 text-sm text-white focus:outline-none" required />
                              </div>
                              <div className="flex flex-col gap-0.5 min-w-[80px]">
                                <label className="text-[10px] uppercase tracking-wider text-slate-500">Code</label>
                                <input type="text" value={editForm.code} onChange={(e) => setEditForm({ ...editForm, code: e.target.value.toUpperCase() })} className="rounded-lg border border-cyan-500/30 bg-white/5 px-2.5 py-1.5 text-sm text-white uppercase focus:outline-none" required />
                              </div>
                              <div className="flex flex-col gap-0.5">
                                <label className="text-[10px] uppercase tracking-wider text-slate-500">Type</label>
                                <TypeSelect value={editForm.type} onChange={(v) => setEditForm({ ...editForm, type: v })} />
                              </div>
                              <div className="flex flex-col gap-0.5">
                                <label className="text-[10px] uppercase tracking-wider text-slate-500">Status</label>
                                <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value as 'active' | 'inactive' })} className="rounded-lg border border-cyan-500/30 bg-[#0c1020] px-2.5 py-1.5 text-sm text-white focus:outline-none">
                                  <option value="active">Active</option><option value="inactive">Inactive</option>
                                </select>
                              </div>
                              <div className="flex gap-2 ml-auto pb-0.5">
                                <button type="submit" disabled={submitting} className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"><Check className="h-4 w-4" /></button>
                                <button type="button" onClick={() => setEditingId(null)} className="p-1.5 rounded-lg bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10"><X className="h-4 w-4" /></button>
                              </div>
                            </form>
                          </td>
                        </tr>
                      ) : (
                        <tr key={item._id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 py-3.5 text-sm font-medium text-white">{item.name}</td>
                          <td className="px-4 py-3.5 font-mono text-xs text-cyan-400">{item.code}</td>
                          <td className="px-4 py-3.5">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${PM_TYPE_COLORS[item.type] || PM_TYPE_COLORS.other}`}>{PM_TYPE_LABELS[item.type] || item.type}</span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase ${item.status === 'active' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-slate-500/10 border border-slate-500/20 text-slate-500'}`}>{item.status}</span>
                          </td>
                          {isAdmin && (
                            <td className="px-4 py-3.5 text-right">
                              <div className="flex justify-end gap-1.5">
                                <button onClick={() => { setEditingId(item._id); setEditForm({ name: item.name, code: item.code, type: item.type, status: item.status }); }} className="p-1.5 rounded-lg text-slate-400 hover:bg-white/5 hover:text-white transition-colors"><Edit3 className="h-3.5 w-3.5" /></button>
                                <button onClick={() => handleDelete(item._id)} className="p-1.5 rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
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

// ─── Tab: Employee Roles ──────────────────────────────────────────────────────

const roleEmpty = { name: '', description: '' };

function RolesTab({ isAdmin }: { isAdmin: boolean }) {
  const [items, setItems] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState(roleEmpty);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(roleEmpty);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setItems((await api.get('/roles')).data); }
    catch (err: any) { setError(err.response?.data?.message || 'Failed to load roles'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); if (!isAdmin) return;
    setSubmitting(true); setError(''); setSuccess('');
    try {
      const r = await api.post('/roles', { name: form.name, description: form.description || undefined });
      setItems((p) => [...p, r.data]); setForm(roleEmpty); setSuccess('Role created');
    } catch (err: any) { setError(err.response?.data?.message || 'Failed to create role'); }
    finally { setSubmitting(false); }
  };

  const handleUpdate = async (e: React.FormEvent, id: string) => {
    e.preventDefault(); if (!isAdmin) return;
    setSubmitting(true); setError(''); setSuccess('');
    try {
      const r = await api.put(`/roles/${id}`, { name: editForm.name, description: editForm.description || undefined });
      setItems((p) => p.map((i) => (i._id === id ? r.data : i))); setEditingId(null); setSuccess('Role updated');
    } catch (err: any) { setError(err.response?.data?.message || 'Failed to update role'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin || !confirm('Delete this role? Employees assigned will lose their role.')) return;
    setError(''); setSuccess('');
    try { await api.delete(`/roles/${id}`); setItems((p) => p.filter((i) => i._id !== id)); setSuccess('Role deleted'); }
    catch (err: any) { setError(err.response?.data?.message || 'Failed to delete role'); }
  };

  return (
    <div className="space-y-5">
      <FeedbackBanner error={error} success={success} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {isAdmin && (
          <div className="lg:col-span-1">
            <div className="rounded-xl border border-white/5 bg-[#0b0f19]/60 p-5 space-y-3 shadow-lg">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20"><ShieldCheck className="h-3.5 w-3.5 text-violet-400" /></div>
                <span className="text-sm font-semibold text-white">Add Role</span>
              </div>
              <form onSubmit={handleCreate} className="space-y-3">
                <div><label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Role Name *</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Finance Manager" className={inputCls} disabled={submitting} required /></div>
                <div><label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Description</label>
                  <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional description" className={inputCls} disabled={submitting} /></div>
                <button type="submit" disabled={submitting} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-semibold text-sm disabled:opacity-50 shadow-lg shadow-cyan-500/20 transition-all">
                  <Plus className="h-4 w-4" />{submitting ? 'Creating...' : 'Create Role'}
                </button>
              </form>
              <p className="text-[11px] text-slate-500 leading-relaxed pt-1">
                Roles created here appear in the <span className="text-violet-400">Invite Employee</span> and <span className="text-violet-400">Edit Employee</span> dropdowns.
              </p>
            </div>
          </div>
        )}
        <div className={isAdmin ? 'lg:col-span-2' : 'lg:col-span-3'}>
          <div className="rounded-xl border border-white/5 bg-[#0b0f19]/60 overflow-hidden shadow-lg">
            <div className="flex items-center justify-between px-5 py-3.5 bg-[#0c1020] border-b border-white/5">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">All Roles</span>
              <button onClick={load} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"><RefreshCw className="h-3.5 w-3.5" /></button>
            </div>
            {loading ? (
              <div className="p-10 text-center text-sm text-slate-500">Loading...</div>
            ) : items.length === 0 ? (
              <div className="p-10 text-center text-sm text-slate-600">No roles yet. Add one →</div>
            ) : (
              <table className="min-w-full divide-y divide-white/5">
                <thead><tr>
                  {['Role Name', 'Description', ...(isAdmin ? [''] : [])].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-white/5">
                  {items.map((item) =>
                    editingId === item._id ? (
                      <tr key={item._id} className="bg-cyan-500/5">
                        <td colSpan={isAdmin ? 3 : 2} className="px-4 py-3">
                          <form onSubmit={(e) => handleUpdate(e, item._id)} className="flex flex-wrap gap-2 items-end">
                            <div className="flex flex-col gap-0.5 min-w-[130px]">
                              <label className="text-[10px] uppercase tracking-wider text-slate-500">Name</label>
                              <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="rounded-lg border border-cyan-500/30 bg-white/5 px-2.5 py-1.5 text-sm text-white focus:outline-none" required />
                            </div>
                            <div className="flex flex-col gap-0.5 flex-1 min-w-[160px]">
                              <label className="text-[10px] uppercase tracking-wider text-slate-500">Description</label>
                              <input type="text" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} placeholder="Optional" className="rounded-lg border border-cyan-500/30 bg-white/5 px-2.5 py-1.5 text-sm text-white focus:outline-none" />
                            </div>
                            <div className="flex gap-2 pb-0.5">
                              <button type="submit" disabled={submitting} className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"><Check className="h-4 w-4" /></button>
                              <button type="button" onClick={() => setEditingId(null)} className="p-1.5 rounded-lg bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10"><X className="h-4 w-4" /></button>
                            </div>
                          </form>
                        </td>
                      </tr>
                    ) : (
                      <tr key={item._id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                              <ShieldCheck className="h-3 w-3 text-violet-400" />
                            </div>
                            <span className="text-sm font-medium text-white">{item.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-sm text-slate-400">{item.description || <span className="text-slate-600 italic">No description</span>}</td>
                        {isAdmin && (
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex justify-end gap-1.5">
                              <button onClick={() => { setEditingId(item._id); setEditForm({ name: item.name, description: item.description || '' }); }} className="p-1.5 rounded-lg text-slate-400 hover:bg-white/5 hover:text-white transition-colors"><Edit3 className="h-3.5 w-3.5" /></button>
                              <button onClick={() => handleDelete(item._id)} className="p-1.5 rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
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

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'profile', label: 'Organization Profile', icon: Building2 },
  { id: 'categories', label: 'Expense Categories', icon: Tag },
  { id: 'payment-methods', label: 'Payment Methods', icon: CreditCard },
  { id: 'roles', label: 'Employee Roles', icon: ShieldCheck },
];

export default function OrganizationSettingsPage() {
  const { user } = useAuthStore();
  const isAdmin = !!(
    user?.role === 'Administrator' ||
    user?.role === 'Organization Admin' ||
    user?.role?.includes('Admin')
  );

  const [activeTab, setActiveTab] = useState<Tab>('profile');

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Organization Settings</h1>
        <p className="text-sm text-slate-400 mt-1">
          Manage your organization profile, expense categories, payment methods, and employee roles.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-1 border-b border-white/10 pb-0">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all duration-200 whitespace-nowrap -mb-px ${
              activeTab === id
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-white/20'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'profile' && <ProfileTab isAdmin={isAdmin} />}
        {activeTab === 'categories' && <CategoriesTab isAdmin={isAdmin} />}
        {activeTab === 'payment-methods' && <PaymentMethodsTab isAdmin={isAdmin} />}
        {activeTab === 'roles' && <RolesTab isAdmin={isAdmin} />}
      </div>
    </div>
  );
}
