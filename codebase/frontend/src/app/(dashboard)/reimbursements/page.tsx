'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { Banknote, FileText, Plus, Landmark, RefreshCw, Trash2, Calendar, CreditCard, ChevronLeft, ChevronRight, X, Eye } from 'lucide-react';

interface ExpenseItem {
  _id: string;
  amount: number;
  currency: string;
  convertedAmount: number;
  merchant: string;
  description?: string;
  employee: {
    name: string;
    email: string;
  };
  project?: {
    name: string;
    code: string;
  };
}

interface PaymentMethodItem {
  _id: string;
  name: string;
  code: string;
  type: string;
  status: string;
}

interface BatchItem {
  _id: string;
  batchName: string;
  status: 'draft' | 'processing' | 'paid';
  totalAmount: number;
  currency: string;
  expenses: ExpenseItem[] | string[];
  paymentMethod?: PaymentMethodItem;
  payoutDate?: string;
  referenceNumber?: string;
  notes?: string;
  createdBy: {
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export default function ReimbursementsPage() {
  const { user: currentUser } = useAuthStore();
  const isAdmin = currentUser?.role === 'Organization Admin' || currentUser?.role?.includes('Admin');

  // Tabs
  const [activeTab, setActiveTab] = useState<'batches' | 'ledger'>('batches');

  // Data states
  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [ledgerData, setLedgerData] = useState<BatchItem[]>([]);
  const [totalLedger, setTotalLedger] = useState(0);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodItem[]>([]);
  const [approvedExpenses, setApprovedExpenses] = useState<ExpenseItem[]>([]);

  // Page / Filter states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerLimit] = useState(10);
  
  // Ledger Filters
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Modals
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<BatchItem | null>(null);

  // Forms
  const [batchNameInput, setBatchNameInput] = useState('');
  const [batchNotesInput, setBatchNotesInput] = useState('');
  const [generateSubmitting, setGenerateSubmitting] = useState(false);

  const [payoutForm, setPayoutForm] = useState({
    paymentMethodId: '',
    referenceNumber: '',
    payoutDate: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [paySubmitting, setPaySubmitting] = useState(false);

  // Loaders
  const loadBatches = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/reimbursements/batches');
      setBatches(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load reimbursement batches');
    } finally {
      setLoading(false);
    }
  };

  const loadLedger = async () => {
    setLoading(true);
    setError('');
    try {
      let url = `/reimbursements/ledger?page=${ledgerPage}&limit=${ledgerLimit}`;
      if (filterPaymentMethod) url += `&paymentMethodId=${filterPaymentMethod}`;
      if (filterStartDate) url += `&startDate=${filterStartDate}`;
      if (filterEndDate) url += `&endDate=${filterEndDate}`;

      const response = await api.get(url);
      setLedgerData(response.data.data);
      setTotalLedger(response.data.total);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load ledger records');
    } finally {
      setLoading(false);
    }
  };

  const loadPaymentMethods = async () => {
    try {
      const response = await api.get('/payment-methods');
      setPaymentMethods(response.data.filter((pm: PaymentMethodItem) => pm.status === 'active'));
    } catch (err) {
      console.error('Failed to load payment methods', err);
    }
  };

  const loadApprovedExpenses = async () => {
    try {
      // Find all approved claims (filtering out in frontend for safety)
      const response = await api.get('/expenses?status=approved');
      setApprovedExpenses(response.data);
    } catch (err) {
      console.error('Failed to load approved claims', err);
    }
  };

  useEffect(() => {
    loadPaymentMethods();
    if (activeTab === 'batches') {
      loadBatches();
      loadApprovedExpenses();
    } else {
      loadLedger();
    }
  }, [activeTab, ledgerPage, filterPaymentMethod, filterStartDate, filterEndDate]);

  // Actions
  const handleOpenGenerate = () => {
    loadApprovedExpenses();
    const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    setBatchNameInput(`Reimbursements - ${dateStr}`);
    setBatchNotesInput('');
    setGenerateModalOpen(true);
  };

  const handleGenerateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    setGenerateSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await api.post('/reimbursements/batches/generate', {
        batchName: batchNameInput,
        notes: batchNotesInput,
      });
      setSuccess('Reimbursement batch generated successfully');
      setGenerateModalOpen(false);
      loadBatches();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to generate batch');
    } finally {
      setGenerateSubmitting(false);
    }
  };

  const handleOpenPay = (batch: BatchItem) => {
    setSelectedBatch(batch);
    setPayoutForm({
      paymentMethodId: paymentMethods[0]?._id || '',
      referenceNumber: '',
      payoutDate: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setPayModalOpen(true);
  };

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !selectedBatch) return;

    setPaySubmitting(true);
    setError('');
    setSuccess('');

    try {
      await api.put(`/reimbursements/batches/${selectedBatch._id}/pay`, payoutForm);
      setSuccess(`Batch "${selectedBatch.batchName}" marked as Paid successfully`);
      setPayModalOpen(false);
      loadBatches();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to pay batch');
    } finally {
      setPaySubmitting(false);
    }
  };

  const handleDeleteBatch = async (id: string) => {
    if (!isAdmin) return;
    if (!confirm('Are you sure you want to delete this draft batch? The expenses will return to the approved queue.')) return;

    setError('');
    setSuccess('');
    try {
      await api.delete(`/reimbursements/batches/${id}`);
      setSuccess('Batch deleted successfully');
      loadBatches();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete batch');
    }
  };

  const handleViewDetails = async (batch: BatchItem) => {
    try {
      const response = await api.get(`/reimbursements/batches/${batch._id}`);
      setSelectedBatch(response.data);
      setDetailModalOpen(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load batch details');
    }
  };

  if (loading) {
    return (
      <div className="flex h-[75vh] items-center justify-center">
        <div className="flex flex-col items-center space-y-2 text-slate-400">
          <RefreshCw className="h-8 w-8 animate-spin text-cyan-400" />
          <span className="text-sm">Retrieving payouts and batches history...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Title Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Reimbursements Ledger</h1>
          <p className="text-sm text-slate-400">Process approved expense claims, generate payroll disbursement batches, and view ledgers.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={activeTab === 'batches' ? loadBatches : loadLedger}
            className="p-2 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-all duration-200"
            title="Reload Data"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          {isAdmin && activeTab === 'batches' && (
            <button
              onClick={handleOpenGenerate}
              className="flex items-center px-4 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-semibold transition-all duration-200 shadow-lg shadow-cyan-500/25 text-sm"
            >
              <Plus className="mr-2 h-4 w-4" />
              Generate Batch
            </button>
          )}
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

      {/* Tabs Layout */}
      <div className="border-b border-white/5 flex space-x-6">
        <button
          onClick={() => { setActiveTab('batches'); setLedgerPage(1); }}
          className={`pb-4 text-sm font-semibold transition-all ${
            activeTab === 'batches'
              ? 'text-cyan-400 border-b-2 border-cyan-400'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Payout Batches
        </button>
        <button
          onClick={() => { setActiveTab('ledger'); setLedgerPage(1); }}
          className={`pb-4 text-sm font-semibold transition-all ${
            activeTab === 'ledger'
              ? 'text-cyan-400 border-b-2 border-cyan-400'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Disbursement Ledger
        </button>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="flex flex-col items-center space-y-2 text-slate-400">
            <RefreshCw className="h-8 w-8 animate-spin text-cyan-400" />
            <span className="text-sm">Loading ledger database...</span>
          </div>
        </div>
      ) : activeTab === 'batches' ? (
        /* TAB 1: BATCHES */
        batches.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 p-12 text-center bg-[#070b14]/50">
            <Banknote className="mx-auto h-12 w-12 text-slate-600 mb-4" />
            <h3 className="text-base font-semibold text-slate-300">No payout batches found</h3>
            <p className="mt-1 text-sm text-slate-500">There are no active draft or processing reimbursement batches in this organization.</p>
            {isAdmin && (
              <button
                onClick={handleOpenGenerate}
                className="mt-4 inline-flex items-center px-4 py-2 rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 font-semibold border border-cyan-500/20 text-sm transition-colors"
              >
                Create Payout Batch
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {batches.map((batch) => (
              <div
                key={batch._id}
                className="rounded-xl border border-white/5 bg-[#0b0f19]/60 backdrop-blur-md p-6 shadow-xl flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 uppercase">
                      {batch.status}
                    </span>
                    <span className="text-xs text-slate-500">
                      {new Date(batch.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{batch.batchName}</h3>
                  <p className="text-2xl font-black tracking-tight text-white mb-4">
                    {batch.totalAmount.toLocaleString('en-US', { style: 'currency', currency: batch.currency })}
                  </p>
                  {batch.notes && (
                    <p className="text-sm text-slate-400 italic mb-4 line-clamp-2">
                      &quot;{batch.notes}&quot;
                    </p>
                  )}
                  <div className="text-xs text-slate-500 space-y-1 mb-6">
                    <p>Created by: <span className="text-slate-300">{batch.createdBy?.name || batch.createdBy?.email}</span></p>
                    <p>Associated claims: <span className="text-slate-300">{batch.expenses?.length || 0}</span></p>
                  </div>
                </div>

                <div className="flex gap-2 border-t border-white/5 pt-4">
                  <button
                    onClick={() => handleViewDetails(batch)}
                    className="flex-1 inline-flex items-center justify-center px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-semibold text-xs border border-white/5 transition-colors"
                  >
                    <Eye className="mr-1.5 h-3.5 w-3.5" />
                    Details
                  </button>
                  {isAdmin && batch.status !== 'paid' && (
                    <>
                      <button
                        onClick={() => handleOpenPay(batch)}
                        className="flex-1 inline-flex items-center justify-center px-3 py-2 rounded-lg bg-cyan-500 text-slate-950 hover:bg-cyan-600 font-semibold text-xs transition-colors shadow-lg shadow-cyan-500/10"
                      >
                        <Landmark className="mr-1.5 h-3.5 w-3.5" />
                        Disburse
                      </button>
                      <button
                        onClick={() => handleDeleteBatch(batch._id)}
                        className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/10 transition-colors"
                        title="Delete Batch"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* TAB 2: LEDGER */
        <div className="space-y-4">
          {/* Ledger Filters Panel */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 bg-[#0b0f19]/40 border border-white/5 rounded-xl p-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Payment Method</label>
              <select
                value={filterPaymentMethod}
                onChange={(e) => setFilterPaymentMethod(e.target.value)}
                className="w-full bg-[#0d1222] border border-white/10 rounded-lg p-2 text-sm text-slate-300 focus:border-cyan-500 focus:outline-none"
              >
                <option value="">All Payout Methods</option>
                {paymentMethods.map((pm) => (
                  <option key={pm._id} value={pm._id}>{pm.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Start Date</label>
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="w-full bg-[#0d1222] border border-white/10 rounded-lg p-2 text-sm text-slate-300 focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">End Date</label>
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="w-full bg-[#0d1222] border border-white/10 rounded-lg p-2 text-sm text-slate-300 focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Ledger Table */}
          {ledgerData.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 p-12 text-center bg-[#070b14]/50">
              <Landmark className="mx-auto h-12 w-12 text-slate-600 mb-4" />
              <h3 className="text-base font-semibold text-slate-300">No disbursement history</h3>
              <p className="mt-1 text-sm text-slate-500">There are no paid ledgers found matching your criteria.</p>
            </div>
          ) : (
            <div className="bg-[#0b0f19]/40 border border-white/5 rounded-xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-white/5 text-left text-sm text-slate-300">
                  <thead className="bg-[#0c1020] text-xs font-semibold tracking-wider text-slate-400 uppercase">
                    <tr>
                      <th className="px-6 py-4">Batch Name</th>
                      <th className="px-6 py-4">Disbursed Date</th>
                      <th className="px-6 py-4">Payout Method</th>
                      <th className="px-6 py-4">Reference Number</th>
                      <th className="px-6 py-4 text-right">Total Amount</th>
                      <th className="px-6 py-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 bg-[#0b0f19]/20">
                    {ledgerData.map((record) => (
                      <tr key={record._id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 font-semibold text-white">{record.batchName}</td>
                        <td className="px-6 py-4 text-slate-400">
                          {record.payoutDate ? new Date(record.payoutDate).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center text-slate-300 text-xs font-semibold bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg">
                            <CreditCard className="mr-1.5 h-3.5 w-3.5 text-cyan-400" />
                            {record.paymentMethod?.name || 'Bank Transfer'}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-slate-400">{record.referenceNumber || 'N/A'}</td>
                        <td className="px-6 py-4 text-right font-bold text-white text-base">
                          {record.totalAmount.toLocaleString('en-US', { style: 'currency', currency: record.currency })}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleViewDetails(record)}
                            className="inline-flex items-center text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
                          >
                            <Eye className="mr-1 h-3 w-3" />
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls */}
              <div className="flex justify-between items-center px-6 py-4 border-t border-white/5 bg-[#0b0f19]/40">
                <span className="text-xs text-slate-500">
                  Showing {ledgerData.length} of {totalLedger} ledgers
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={ledgerPage === 1}
                    onClick={() => setLedgerPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    disabled={ledgerPage * ledgerLimit >= totalLedger}
                    onClick={() => setLedgerPage((p) => p + 1)}
                    className="p-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: GENERATE BATCH */}
      {generateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setGenerateModalOpen(false)} />
          <div className="relative w-full max-w-2xl bg-[#0b0f19] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-white/5">
              <h2 className="text-lg font-bold text-white">Generate Reimbursement Batch</h2>
              <button onClick={() => setGenerateModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleGenerateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Batch Name</label>
                <input
                  type="text"
                  value={batchNameInput}
                  onChange={(e) => setBatchNameInput(e.target.value)}
                  required
                  placeholder="e.g. Travel Claims July 2026"
                  className="w-full bg-[#0d1222] border border-white/10 rounded-lg p-2.5 text-slate-200 outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Notes</label>
                <textarea
                  value={batchNotesInput}
                  onChange={(e) => setBatchNotesInput(e.target.value)}
                  placeholder="Additional remarks..."
                  rows={3}
                  className="w-full bg-[#0d1222] border border-white/10 rounded-lg p-2.5 text-slate-200 outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Pending Approved Claims ({approvedExpenses.length})
                </label>
                <div className="max-h-48 overflow-y-auto border border-white/5 rounded-lg bg-[#070b14]/50 divide-y divide-white/5">
                  {approvedExpenses.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500">
                      No pending approved claims found. Approve some submitted claims first.
                    </div>
                  ) : (
                    approvedExpenses.map((exp) => (
                      <div key={exp._id} className="p-3 flex justify-between items-center text-xs">
                        <div>
                          <p className="font-semibold text-slate-200">{exp.merchant}</p>
                          <p className="text-slate-500">
                            Employee: {exp.employee?.name || 'Unknown'} {exp.project ? `• Proj: ${exp.project.code}` : ''}
                          </p>
                        </div>
                        <span className="font-mono font-bold text-cyan-400 text-sm">
                          {exp.amount} {exp.currency}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setGenerateModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-slate-300 font-semibold text-sm hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generateSubmitting || approvedExpenses.length === 0}
                  className="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-semibold text-sm hover:bg-cyan-600 disabled:opacity-50 transition-all shadow-lg shadow-cyan-500/10"
                >
                  {generateSubmitting ? 'Generating...' : 'Generate Payout Batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: PAY BATCH */}
      {payModalOpen && selectedBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setPayModalOpen(false)} />
          <div className="relative w-full max-w-md bg-[#0b0f19] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-white/5">
              <div>
                <h2 className="text-lg font-bold text-white">Disburse Reimbursement</h2>
                <p className="text-xs text-slate-500">Mark batch &quot;{selectedBatch.batchName}&quot; as paid.</p>
              </div>
              <button onClick={() => setPayModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handlePaySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Disbursement Method</label>
                <select
                  value={payoutForm.paymentMethodId}
                  onChange={(e) => setPayoutForm((f) => ({ ...f, paymentMethodId: e.target.value }))}
                  required
                  className="w-full bg-[#0d1222] border border-white/10 rounded-lg p-2.5 text-slate-200 outline-none focus:border-cyan-500"
                >
                  <option value="" disabled>Select Payout Method</option>
                  {paymentMethods.map((pm) => (
                    <option key={pm._id} value={pm._id}>{pm.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Reference Number (Txn ID)</label>
                <input
                  type="text"
                  value={payoutForm.referenceNumber}
                  onChange={(e) => setPayoutForm((f) => ({ ...f, referenceNumber: e.target.value }))}
                  required
                  placeholder="e.g. UTR-100239103"
                  className="w-full bg-[#0d1222] border border-white/10 rounded-lg p-2.5 text-slate-200 outline-none focus:border-cyan-500 font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Payout Date</label>
                <input
                  type="date"
                  value={payoutForm.payoutDate}
                  onChange={(e) => setPayoutForm((f) => ({ ...f, payoutDate: e.target.value }))}
                  required
                  className="w-full bg-[#0d1222] border border-white/10 rounded-lg p-2.5 text-slate-200 outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Payout Remarks</label>
                <textarea
                  value={payoutForm.notes}
                  onChange={(e) => setPayoutForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Add optional notes..."
                  rows={2}
                  className="w-full bg-[#0d1222] border border-white/10 rounded-lg p-2.5 text-slate-200 outline-none focus:border-cyan-500"
                />
              </div>

              <div className="bg-cyan-500/5 border border-cyan-500/10 rounded-lg p-4 text-xs flex justify-between items-center">
                <span className="text-slate-400 font-medium">Grand Total to disburse:</span>
                <span className="text-white font-bold text-base">
                  {selectedBatch.totalAmount.toLocaleString('en-US', { style: 'currency', currency: selectedBatch.currency })}
                </span>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setPayModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-slate-300 font-semibold text-sm hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paySubmitting}
                  className="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-semibold text-sm hover:bg-cyan-600 disabled:opacity-50 transition-all shadow-lg shadow-cyan-500/10"
                >
                  {paySubmitting ? 'Processing Payout...' : 'Mark as Paid'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: BATCH DETAILS */}
      {detailModalOpen && selectedBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setDetailModalOpen(false)} />
          <div className="relative w-full max-w-3xl bg-[#0b0f19] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-white/5">
              <div>
                <h2 className="text-lg font-bold text-white">{selectedBatch.batchName}</h2>
                <p className="text-xs text-slate-500">Batch ID: {selectedBatch._id}</p>
              </div>
              <button onClick={() => setDetailModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-[#070b14]/50 p-4 border border-white/5 rounded-xl text-xs sm:grid-cols-4">
              <div>
                <p className="text-slate-500">Status</p>
                <p className="font-bold text-white capitalize mt-0.5">{selectedBatch.status}</p>
              </div>
              <div>
                <p className="text-slate-500">Total Payout</p>
                <p className="font-bold text-cyan-400 mt-0.5">
                  {selectedBatch.totalAmount.toLocaleString('en-US', { style: 'currency', currency: selectedBatch.currency })}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Created Date</p>
                <p className="font-bold text-slate-300 mt-0.5">{new Date(selectedBatch.createdAt).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-slate-500">Payout Reference</p>
                <p className="font-mono text-slate-300 mt-0.5 truncate">{selectedBatch.referenceNumber || 'Pending'}</p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white">Included Expenses ({selectedBatch.expenses?.length || 0})</h3>
              <div className="max-h-60 overflow-y-auto border border-white/5 rounded-lg bg-[#070b14]/30 divide-y divide-white/5">
                {(selectedBatch.expenses as any[]).map((exp) => (
                  <div key={exp._id} className="p-3 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-semibold text-slate-200">{exp.merchant}</p>
                      <p className="text-slate-500">
                        Employee: {exp.employee?.name || 'Unknown'} {exp.project ? `• Proj: ${exp.project.name} (${exp.project.code})` : ''}
                      </p>
                      {exp.description && <p className="text-[10px] text-slate-500 italic mt-0.5">&quot;{exp.description}&quot;</p>}
                    </div>
                    <span className="font-mono font-bold text-cyan-400 text-sm">
                      {exp.amount} {exp.currency}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {selectedBatch.notes && (
              <div className="bg-white/5 border border-white/5 rounded-lg p-3 text-xs">
                <span className="font-semibold text-slate-400 block mb-1">Batch Notes</span>
                <span className="text-slate-300 italic">&quot;{selectedBatch.notes}&quot;</span>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-white/5">
              <button
                onClick={() => setDetailModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 font-semibold text-sm border border-white/5 transition-colors"
              >
                Close details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
