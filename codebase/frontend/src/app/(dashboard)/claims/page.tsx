'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { FilePlus, FileText, Trash2, CheckCircle, RefreshCw, X, Receipt, Upload, Check, DollarSign } from 'lucide-react';

interface DropdownOption {
  _id: string;
  name: string;
  code: string;
}

interface ExpenseClaimItem {
  _id: string;
  amount: number;
  currency: string;
  convertedAmount: number;
  exchangeRate: number;
  date: string;
  category: DropdownOption;
  paymentMethod: DropdownOption & { type: string };
  project?: DropdownOption;
  merchant: string;
  description?: string;
  receiptUrl?: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'reimbursed';
}

export default function ClaimsPage() {
  const { user: currentUser } = useAuthStore();
  const [claims, setClaims] = useState<ExpenseClaimItem[]>([]);
  const [categories, setCategories] = useState<DropdownOption[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<DropdownOption[]>([]);
  const [projects, setProjects] = useState<DropdownOption[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Form State
  const [createForm, setCreateForm] = useState({
    amount: 0,
    currency: 'USD',
    date: new Date().toISOString().split('T')[0],
    category: '',
    paymentMethod: '',
    project: '',
    merchant: '',
    description: '',
    receiptFile: null as File | null,
    receiptMockUrl: '',
  });
  const [createSubmitting, setCreateSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [claimsRes, catRes, pmRes, projRes] = await Promise.all([
        api.get('/expenses'),
        api.get('/categories'),
        api.get('/payment-methods'),
        api.get('/projects'),
      ]);
      setClaims(claimsRes.data);
      setCategories(catRes.data.filter((c: any) => c.status === 'active'));
      setPaymentMethods(pmRes.data.filter((p: any) => p.status === 'active'));
      setProjects(projRes.data.filter((p: any) => p.status === 'active'));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load expense claims data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent, status: 'draft' | 'submitted') => {
    e.preventDefault();
    setCreateSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post('/expenses', {
        amount: Number(createForm.amount),
        currency: createForm.currency,
        date: new Date(createForm.date).toISOString(),
        category: createForm.category,
        paymentMethod: createForm.paymentMethod,
        project: createForm.project || undefined,
        merchant: createForm.merchant,
        description: createForm.description || undefined,
        receiptUrl: createForm.receiptMockUrl || undefined,
        status,
      });

      setSuccess(status === 'submitted' ? 'Claim submitted successfully' : 'Claim saved as draft');
      setCreateModalOpen(false);
      setCreateForm({
        amount: 0,
        currency: 'USD',
        date: new Date().toISOString().split('T')[0],
        category: '',
        paymentMethod: '',
        project: '',
        merchant: '',
        description: '',
        receiptFile: null,
        receiptMockUrl: '',
      });
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create expense claim');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleMockUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCreateForm((prev) => ({
        ...prev,
        receiptFile: file,
        receiptMockUrl: `/receipts/mock-upload-${Date.now()}-${file.name}`,
      }));
    }
  };

  const handleSubmitDraft = async (id: string) => {
    setError('');
    setSuccess('');
    try {
      await api.put(`/expenses/${id}`, { status: 'submitted' });
      setSuccess('Draft claim submitted successfully');
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit draft claim');
    }
  };

  const handleDeleteDraft = async (id: string) => {
    if (!confirm('Are you sure you want to delete this draft claim?')) return;
    setError('');
    setSuccess('');
    try {
      await api.delete(`/expenses/${id}`);
      setSuccess('Draft claim deleted successfully');
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete draft claim');
    }
  };

  // Stats
  const draftCount = claims.filter((c) => c.status === 'draft').length;
  const pendingCount = claims.filter((c) => c.status === 'submitted').length;
  const approvedCount = claims.filter((c) => c.status === 'approved').length;
  const totalReimbursedAmount = claims
    .filter((c) => c.status === 'reimbursed' || c.status === 'approved')
    .reduce((sum, c) => sum + c.convertedAmount, 0);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Title Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Expense Claims</h1>
          <p className="text-sm text-slate-400">File new expenses, attach invoices, and track submission progress.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={loadData}
            className="p-2 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-all duration-200"
            title="Reload"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center px-4 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-semibold transition-all duration-200 shadow-lg shadow-cyan-500/25 text-sm"
          >
            <FilePlus className="mr-2 h-4 w-4" />
            File Claim
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
          {success}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="rounded-xl border border-white/5 bg-[#0b0f19]/60 p-5 space-y-1">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Draft Claims</span>
          <p className="text-2xl font-extrabold text-slate-300">{draftCount}</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-[#0b0f19]/60 p-5 space-y-1">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending Approval</span>
          <p className="text-2xl font-extrabold text-amber-400">{pendingCount}</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-[#0b0f19]/60 p-5 space-y-1">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Approved Claims</span>
          <p className="text-2xl font-extrabold text-emerald-400">{approvedCount}</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-[#0b0f19]/60 p-5 space-y-1">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Approved Total (Base)</span>
          <p className="text-2xl font-extrabold text-white">
            {totalReimbursedAmount.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}
          </p>
        </div>
      </div>

      {/* Claims List Table */}
      <div className="rounded-xl border border-white/5 bg-[#0b0f19]/40 overflow-hidden shadow-lg">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-md font-bold text-white tracking-tight flex items-center gap-2">
            <FileText className="h-4 w-4 text-cyan-400" />
            Claim History
          </h3>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500">Loading claims list...</div>
        ) : claims.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No expense claims filed yet. Click File Claim to create one.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs text-slate-300">
              <thead>
                <tr className="border-b border-white/5 bg-white/5 text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                  <th className="p-4">Date</th>
                  <th className="p-4">Merchant</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Project</th>
                  <th className="p-4">Payment Method</th>
                  <th className="p-4 text-right">Original Amount</th>
                  <th className="p-4 text-right">Converted (Base)</th>
                  <th className="p-4">Receipt</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {claims.map((claim) => (
                  <tr key={claim._id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4 font-mono">{new Date(claim.date).toLocaleDateString()}</td>
                    <td className="p-4 font-semibold text-white">{claim.merchant}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 font-medium font-mono uppercase">
                        {claim.category?.name || 'N/A'}
                      </span>
                    </td>
                    <td className="p-4">
                      {claim.project ? (
                        <span className="text-cyan-400 font-semibold">{claim.project.name}</span>
                      ) : (
                        <span className="text-slate-600">None</span>
                      )}
                    </td>
                    <td className="p-4 capitalize">{claim.paymentMethod?.name || 'N/A'}</td>
                    <td className="p-4 text-right font-semibold">
                      {claim.amount.toLocaleString(undefined, { style: 'currency', currency: claim.currency })}
                    </td>
                    <td className="p-4 text-right font-semibold text-slate-200">
                      {claim.convertedAmount.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}
                      {claim.exchangeRate !== 1 && (
                        <span className="block text-[9px] text-slate-500">Rate: {claim.exchangeRate}</span>
                      )}
                    </td>
                    <td className="p-4">
                      {claim.receiptUrl ? (
                        <a
                          href="#"
                          onClick={(e) => { e.preventDefault(); alert(`Mock previewing receipt file: ${claim.receiptUrl}`); }}
                          className="flex items-center text-cyan-400 hover:text-cyan-300 underline gap-1"
                        >
                          <Receipt className="h-3 w-3" />
                          View
                        </a>
                      ) : (
                        <span className="text-slate-600">No Attachment</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase ${
                        claim.status === 'draft'
                          ? 'bg-slate-500/10 border border-slate-500/20 text-slate-400'
                          : claim.status === 'submitted'
                          ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                          : claim.status === 'approved'
                          ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                          : 'bg-red-500/10 border border-red-500/20 text-red-400'
                      }`}>
                        {claim.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {claim.status === 'draft' && (
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => handleSubmitDraft(claim._id)}
                            className="px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 text-[10px] font-bold"
                          >
                            Submit
                          </button>
                          <button
                            onClick={() => handleDeleteDraft(claim._id)}
                            className="p-1 rounded bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20"
                            title="Delete Draft"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Claim Creation Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setCreateModalOpen(false)} />
          <div className="relative w-full max-w-lg rounded-xl border border-white/5 bg-[#0b0f19] p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-white">File Expense Claim</h3>
              <button onClick={() => setCreateModalOpen(false)} className="text-slate-500 hover:text-slate-300">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Merchant Name</label>
                  <input
                    type="text"
                    value={createForm.merchant}
                    onChange={(e) => setCreateForm({ ...createForm, merchant: e.target.value })}
                    placeholder="Uber Ride"
                    className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Date of Expense</label>
                  <input
                    type="date"
                    value={createForm.date}
                    onChange={(e) => setCreateForm({ ...createForm, date: e.target.value })}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-[#0c1020] px-4 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Expense Amount</label>
                  <input
                    type="number"
                    value={createForm.amount}
                    onChange={(e) => setCreateForm({ ...createForm, amount: Number(e.target.value) })}
                    placeholder="120.00"
                    className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Currency</label>
                  <select
                    value={createForm.currency}
                    onChange={(e) => setCreateForm({ ...createForm, currency: e.target.value })}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-[#0c1020] px-4 py-2.5 text-sm text-white focus:border-cyan-500"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="INR">INR (₹)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Expense Category</label>
                  <select
                    value={createForm.category}
                    onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-[#0c1020] px-4 py-2.5 text-sm text-white focus:border-cyan-500"
                    required
                  >
                    <option value="">Select Category...</option>
                    {categories.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Payment Method</label>
                  <select
                    value={createForm.paymentMethod}
                    onChange={(e) => setCreateForm({ ...createForm, paymentMethod: e.target.value })}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-[#0c1020] px-4 py-2.5 text-sm text-white focus:border-cyan-500"
                    required
                  >
                    <option value="">Select Method...</option>
                    {paymentMethods.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Link Project (Optional)</label>
                <select
                  value={createForm.project}
                  onChange={(e) => setCreateForm({ ...createForm, project: e.target.value })}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-[#0c1020] px-4 py-2.5 text-sm text-white focus:border-cyan-500"
                >
                  <option value="">No Project Linkage</option>
                  {projects.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} ({p.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Description / Business Purpose</label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="Client dinner meeting with NASA delegates"
                  className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                  rows={2}
                />
              </div>

              {/* Receipt File upload */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Receipt Attachment</label>
                <div className="mt-2 border border-dashed border-white/10 hover:border-white/20 rounded-lg p-4 bg-white/5 flex flex-col items-center justify-center cursor-pointer relative">
                  <input
                    type="file"
                    onChange={handleMockUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  {createForm.receiptFile ? (
                    <div className="flex items-center gap-2 text-xs text-slate-300 font-semibold">
                      <Check className="h-4 w-4 text-emerald-400" />
                      <span>{createForm.receiptFile.name} (Attached)</span>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-6 w-6 text-slate-500 mb-1" />
                      <span className="text-xs text-slate-400 font-semibold">Click to upload invoice / receipt</span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">Supports PDF, PNG, JPG</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-white/10 hover:bg-white/5 text-slate-200 text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={(e) => handleCreateSubmit(e, 'draft')}
                  disabled={createSubmitting}
                  className="px-4 py-2 rounded-lg border border-cyan-500/30 hover:bg-cyan-500/5 text-cyan-400 text-sm font-semibold transition-colors"
                >
                  Save Draft
                </button>
                <button
                  type="button"
                  onClick={(e) => handleCreateSubmit(e, 'submitted')}
                  disabled={createSubmitting}
                  className="px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-semibold transition-colors text-sm"
                >
                  {createSubmitting ? 'Submitting...' : 'Submit Claim'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
