'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useOrgStore } from '@/store/org.store';
import { FilePlus, FileText, Trash2, RefreshCw, X, Receipt, Upload, Check, ChevronRight, ChevronLeft, AlertTriangle, Edit, ZoomIn, ZoomOut, RotateCw, Eye, EyeOff } from 'lucide-react';

interface CategoryOption {
  _id: string;
  name: string;
  code: string;
  requireReceipt: boolean;
  maxLimit?: number;
}

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
  category: CategoryOption;
  paymentMethod: DropdownOption & { type: string };
  project?: DropdownOption;
  merchant: string;
  gst?: number;
  vendor?: string;
  description?: string;
  receiptUrl?: string;
  receiptUrls?: string[];
  requestReimbursement?: boolean;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'reimbursed';
}

export default function ClaimsPage() {
  const { user: currentUser } = useAuthStore();
  const { currency: orgCurrency } = useOrgStore();
  const [claims, setClaims] = useState<ExpenseClaimItem[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<DropdownOption[]>([]);
  const [projects, setProjects] = useState<(DropdownOption & { budget?: number; spent?: number })[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modals & Stepper
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1); // Steps: 1 (Basics), 2 (Linkages), 3 (Receipt)

  // Drag and Drop
  const [isDragOver, setIsDragOver] = useState(false);

  // Form State
  const [createForm, setCreateForm] = useState({
    amount: 0,
    currency: 'USD',
    date: new Date().toISOString().split('T')[0],
    category: '',
    paymentMethod: '',
    project: '',
    merchant: '',
    gst: 0,
    vendor: '',
    description: '',
    receiptFile: null as File | null,
    receiptUrl: '',
    requestReimbursement: false,
    receiptUrls: [] as string[],
  });

  const [allVendors, setAllVendors] = useState<any[]>([]);
  const [editingClaimId, setEditingClaimId] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);
  const [vendorSearch, setVendorSearch] = useState('');

  // Lightbox Preview States
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [rotationAngle, setRotationAngle] = useState(0);

  useEffect(() => {
    if (orgCurrency) {
      setCreateForm((f) => ({ ...f, currency: orgCurrency }));
    }
  }, [orgCurrency]);

  const [createSubmitting, setCreateSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [claimsRes, catRes, pmRes, projRes, vendorRes] = await Promise.all([
        api.get('/expenses'),
        api.get('/categories'),
        api.get('/payment-methods'),
        api.get('/projects'),
        api.get('/vendors'),
      ]);
      setClaims(claimsRes.data);
      setCategories(catRes.data.filter((c: any) => c.status === 'active'));
      setPaymentMethods(pmRes.data.filter((p: any) => p.status === 'active'));
      setProjects(projRes.data.filter((p: any) => p.status === 'active'));
      setAllVendors(vendorRes.data.filter((v: any) => v.status === 'active'));
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

    // Pre-submit validation for Category Rules
    const selectedCategory = categories.find((c) => c._id === createForm.category);
    if (selectedCategory) {
      if (status === 'submitted' && selectedCategory.requireReceipt && !createForm.receiptUrl && createForm.receiptUrls.length === 0) {
        setError(`A receipt upload is mandatory for category "${selectedCategory.name}"`);
        setCreateSubmitting(false);
        return;
      }
      if (selectedCategory.maxLimit && createForm.amount > selectedCategory.maxLimit && createForm.currency === orgCurrency) {
        setError(`This expense exceeds the category limit of ${selectedCategory.maxLimit} ${orgCurrency}`);
        setCreateSubmitting(false);
        return;
      }
    }

    try {
      await api.post('/expenses', {
        amount: Number(createForm.amount),
        currency: createForm.currency,
        date: new Date(createForm.date).toISOString(),
        category: createForm.category,
        paymentMethod: createForm.paymentMethod,
        project: createForm.project || undefined,
        merchant: createForm.merchant,
        gst: createForm.gst ? Number(createForm.gst) : undefined,
        vendor: createForm.vendor || undefined,
        description: createForm.description || undefined,
        receiptUrl: createForm.receiptUrl || undefined,
        receiptUrls: createForm.receiptUrls,
        requestReimbursement: createForm.requestReimbursement,
        status,
      });

      setSuccess(status === 'submitted' ? 'Claim submitted successfully' : 'Claim saved as draft');
      setCreateModalOpen(false);
      resetForm();
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create expense claim');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleUpdateSubmit = async (e: React.FormEvent, status: 'draft' | 'submitted') => {
    e.preventDefault();
    if (!editingClaimId) return;
    setCreateSubmitting(true);
    setError('');
    setSuccess('');

    const selectedCategory = categories.find((c) => c._id === createForm.category);
    if (selectedCategory) {
      if (status === 'submitted' && selectedCategory.requireReceipt && !createForm.receiptUrl && createForm.receiptUrls.length === 0) {
        setError(`A receipt upload is mandatory for category "${selectedCategory.name}"`);
        setCreateSubmitting(false);
        return;
      }
      if (selectedCategory.maxLimit && createForm.amount > selectedCategory.maxLimit && createForm.currency === orgCurrency) {
        setError(`This expense exceeds the category limit of ${selectedCategory.maxLimit} ${orgCurrency}`);
        setCreateSubmitting(false);
        return;
      }
    }

    try {
      await api.put(`/expenses/${editingClaimId}`, {
        amount: Number(createForm.amount),
        currency: createForm.currency,
        date: new Date(createForm.date).toISOString(),
        category: createForm.category,
        paymentMethod: createForm.paymentMethod,
        project: createForm.project || undefined,
        merchant: createForm.merchant,
        gst: createForm.gst ? Number(createForm.gst) : undefined,
        vendor: createForm.vendor || undefined,
        description: createForm.description || undefined,
        receiptUrl: createForm.receiptUrl || undefined,
        receiptUrls: createForm.receiptUrls,
        requestReimbursement: createForm.requestReimbursement,
        status,
      });

      setSuccess('Expense claim updated successfully');
      setCreateModalOpen(false);
      resetForm();
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update expense claim');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const openEditModal = (claim: any) => {
    setEditingClaimId(claim._id);
    setCreateForm({
      amount: claim.amount,
      currency: claim.currency,
      date: new Date(claim.date).toISOString().split('T')[0],
      category: claim.category?._id || claim.category || '',
      paymentMethod: claim.paymentMethod?._id || claim.paymentMethod || '',
      project: claim.project?._id || claim.project || '',
      merchant: claim.merchant,
      gst: claim.gst || 0,
      vendor: claim.vendor?._id || claim.vendor || '',
      description: claim.description || '',
      receiptFile: null,
      receiptUrl: claim.receiptUrl || '',
      requestReimbursement: claim.requestReimbursement || false,
      receiptUrls: claim.receiptUrls || (claim.receiptUrl ? [claim.receiptUrl] : []),
    });
    setVendorSearch('');
    const matchedVendor = allVendors.find((v) => v._id === claim.vendor);
    if (matchedVendor) {
      setVendorSearch(matchedVendor.name);
    }
    setCreateModalOpen(true);
    setCurrentStep(1);
  };

  const resetForm = () => {
    setCreateForm({
      amount: 0,
      currency: orgCurrency || 'USD',
      date: new Date().toISOString().split('T')[0],
      category: '',
      paymentMethod: '',
      project: '',
      merchant: '',
      gst: 0,
      vendor: '',
      description: '',
      receiptFile: null,
      receiptUrl: '',
      requestReimbursement: false,
      receiptUrls: [],
    });
    setEditingClaimId(null);
    setVendorSearch('');
    setCurrentStep(1);
  };

  // Multipart File Upload Endpoint calling
  const handleFileUpload = async (file: File) => {
    setError('');
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/expenses/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setCreateForm((prev) => {
        const newUrls = [...prev.receiptUrls, res.data.url];
        return {
          ...prev,
          receiptUrls: newUrls,
          receiptUrl: newUrls[0] || '',
        };
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to upload receipt file');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await handleFileUpload(e.target.files[0]);
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

  const selectedCategoryObj = categories.find((c) => c._id === createForm.category);

  // Stats
  const draftCount = claims.filter((c) => c.status === 'draft').length;
  const pendingCount = claims.filter((c) => c.status === 'submitted').length;
  const approvedCount = claims.filter((c) => c.status === 'approved').length;
  const totalReimbursedAmount = claims
    .filter((c) => c.status === 'reimbursed' || c.status === 'approved')
    .reduce((sum, c) => sum + c.convertedAmount, 0);

  if (loading) {
    return (
      <div className="flex h-[75vh] items-center justify-center">
        <div className="flex flex-col items-center space-y-2 text-slate-400">
          <RefreshCw className="h-8 w-8 animate-spin text-cyan-400" />
          <span className="text-sm">Retrieving cost claims ledger...</span>
        </div>
      </div>
    );
  }

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
            onClick={() => { resetForm(); setCreateModalOpen(true); }}
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
            {totalReimbursedAmount.toLocaleString(undefined, { style: 'currency', currency: orgCurrency || 'USD' })}
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
          <div className="p-12 text-center text-slate-500 font-semibold">No expense claims filed yet. Click File Claim to create one.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs text-slate-300">
              <thead>
                <tr className="border-b border-white/5 bg-white/5 text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                  <th className="p-4">Date</th>
                  <th className="p-4">Merchant</th>
                  <th className="p-4">Vendor</th>
                  <th className="p-4">GST</th>
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
                    <td className="p-4">{claim.vendor || <span className="text-slate-600">N/A</span>}</td>
                    <td className="p-4 font-mono">{claim.gst ? claim.gst.toLocaleString(undefined, { style: 'currency', currency: claim.currency }) : <span className="text-slate-600">N/A</span>}</td>
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
                      {claim.convertedAmount.toLocaleString(undefined, { style: 'currency', currency: orgCurrency || 'USD' })}
                      {claim.exchangeRate !== 1 && (
                        <span className="block text-[9px] text-slate-500">Rate: {claim.exchangeRate}</span>
                      )}
                    </td>
                    <td className="p-4">
                      {claim.receiptUrls && claim.receiptUrls.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {claim.receiptUrls.map((url: string, idx: number) => (
                            <button
                              key={idx}
                              onClick={() => {
                                setPreviewUrl(url);
                                setZoomScale(1);
                                setRotationAngle(0);
                              }}
                              className="flex items-center text-cyan-400 hover:text-cyan-300 underline gap-1 font-semibold text-left"
                            >
                              <Receipt className="h-3 w-3" />
                              Receipt {idx + 1}
                            </button>
                          ))}
                        </div>
                      ) : claim.receiptUrl ? (
                        <button
                          onClick={() => {
                            setPreviewUrl(claim.receiptUrl || null);
                            setZoomScale(1);
                            setRotationAngle(0);
                          }}
                          className="flex items-center text-cyan-400 hover:text-cyan-300 underline gap-1 font-semibold text-left"
                        >
                          <Receipt className="h-3 w-3" />
                          View
                        </button>
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
                      <div className="flex gap-2 justify-end">
                        {claim.status === 'draft' && (
                          <button
                            onClick={() => handleSubmitDraft(claim._id)}
                            className="px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 text-[10px] font-bold"
                          >
                            Submit
                          </button>
                        )}
                        {(claim.status === 'draft' || claim.status === 'submitted') && (
                          <button
                            onClick={() => openEditModal(claim)}
                            className="p-1 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20"
                            title="Edit Claim"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {claim.status === 'draft' && (
                          <button
                            onClick={() => handleDeleteDraft(claim._id)}
                            className="p-1 rounded bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20"
                            title="Delete Draft"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Claim Creation Stepper Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setCreateModalOpen(false)} />
          <div className="relative w-full max-w-lg rounded-xl border border-white/5 bg-[#0b0f19] p-6 shadow-2xl space-y-4">
            
            {/* Header */}
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-white">File Expense Claim</h3>
                <span className="text-xs text-slate-400">Step {currentStep} of 3</span>
              </div>
              <button onClick={() => setCreateModalOpen(false)} className="text-slate-500 hover:text-slate-300">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Stepper Progress Bar */}
            <div className="flex items-center gap-2">
              <div className={`h-1.5 flex-1 rounded-full ${currentStep >= 1 ? 'bg-cyan-500' : 'bg-white/5'}`} />
              <div className={`h-1.5 flex-1 rounded-full ${currentStep >= 2 ? 'bg-cyan-500' : 'bg-white/5'}`} />
              <div className={`h-1.5 flex-1 rounded-full ${currentStep >= 3 ? 'bg-cyan-500' : 'bg-white/5'}`} />
            </div>

            <form className="space-y-4 pt-2">
              
              {/* STEP 1: Basic Expense Info */}
              {currentStep === 1 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Merchant</label>
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
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Date</label>
                      <input
                        type="date"
                        value={createForm.date}
                        onChange={(e) => setCreateForm({ ...createForm, date: e.target.value })}
                        className="mt-2 w-full rounded-lg border border-white/10 bg-[#0c1020] px-4 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Amount ({orgCurrency})</label>
                      <input
                        type="number"
                        value={createForm.amount}
                        onChange={(e) => setCreateForm({ ...createForm, amount: Number(e.target.value) })}
                        placeholder="120.00"
                        className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
                        required
                      />
                    </div>
                    <div className="relative">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Vendor (Optional)</label>
                      <input
                        type="text"
                        placeholder="Search Vendor..."
                        value={vendorSearch}
                        onChange={(e) => {
                          setVendorSearch(e.target.value);
                          setShowVendorDropdown(true);
                        }}
                        onFocus={() => setShowVendorDropdown(true)}
                        className="mt-2 w-full rounded-lg border border-white/10 bg-[#0c1020] px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                      />
                      {showVendorDropdown && (
                        <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-slate-700 bg-slate-900 p-1 shadow-lg">
                          <div
                            onClick={() => {
                              setCreateForm({ ...createForm, vendor: '' });
                              setVendorSearch('');
                              setShowVendorDropdown(false);
                            }}
                            className="cursor-pointer rounded p-2 text-xs text-slate-400 hover:bg-slate-800 hover:text-white"
                          >
                            None (Clear Selection)
                          </div>
                          {allVendors
                            .filter((v) => {
                              if (vendorSearch && !v.name.toLowerCase().includes(vendorSearch.toLowerCase())) {
                                return false;
                              }
                              if (!createForm.project) return true;
                              return !v.projects || v.projects.length === 0 || v.projects.some((p: any) => (p._id || p).toString() === createForm.project);
                            })
                            .map((v) => (
                              <div
                                key={v._id}
                                onClick={() => {
                                  setCreateForm({ ...createForm, vendor: v._id });
                                  setVendorSearch(v.name);
                                  setShowVendorDropdown(false);
                                }}
                                className="cursor-pointer rounded p-2 text-xs text-white hover:bg-slate-800"
                              >
                                {v.name}
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">GST (Optional)</label>
                      <input
                        type="number"
                        value={createForm.gst}
                        onChange={(e) => setCreateForm({ ...createForm, gst: Number(e.target.value) })}
                        placeholder="12.00"
                        className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                    <div className="col-span-2 flex items-center space-x-2 pt-3">
                      <input
                        type="checkbox"
                        id="requestReimbursement"
                        checked={createForm.requestReimbursement}
                        onChange={(e) => setCreateForm({ ...createForm, requestReimbursement: e.target.checked })}
                        className="h-4 w-4 rounded border-white/10 bg-white/5 text-cyan-500 focus:ring-cyan-500"
                      />
                      <label htmlFor="requestReimbursement" className="text-xs font-semibold text-slate-300">
                        Request Reimbursement
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: Classification */}
              {currentStep === 2 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Category</label>
                      <select
                        value={createForm.category}
                        onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                        className="mt-2 w-full rounded-lg border border-white/10 bg-[#0c1020] px-4 py-2.5 text-sm text-white focus:border-cyan-500"
                        required
                      >
                        <option value="">Select Category...</option>
                        {categories.map((c) => (
                          <option key={c._id} value={c._id}>
                            {c.name} {c.maxLimit ? `(Limit: ${orgCurrency} ${c.maxLimit.toLocaleString()})` : ''}
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
                      onChange={(e) => {
                        setCreateForm({ ...createForm, project: e.target.value, vendor: '' });
                        setVendorSearch('');
                      }}
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

                  {createForm.project && createForm.amount > 0 && (
                    (() => {
                      const proj = projects.find((p) => p._id === createForm.project);
                      if (!proj) return null;
                      const budget = proj.budget || 0;
                      const spent = proj.spent || 0;
                      const remaining = budget - spent;
                      if (remaining <= 0) {
                        return (
                          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold flex gap-2 items-center">
                            <AlertTriangle className="h-4 w-4 shrink-0" />
                            <span>Warning: This project has fully consumed its budget ({orgCurrency} {budget.toLocaleString()} / {orgCurrency} {spent.toLocaleString()} spent).</span>
                          </div>
                        );
                      }
                      const percentConsumed = (createForm.amount / remaining) * 100;
                      if (percentConsumed >= 80) {
                        return (
                          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold flex gap-2 items-center">
                            <AlertTriangle className="h-4 w-4 shrink-0" />
                            <span>Warning: This claim will consume {percentConsumed.toFixed(1)}% of remaining project budget ({orgCurrency} {remaining.toLocaleString()} left).</span>
                          </div>
                        );
                      }
                      return null;
                    })()
                  )}

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Description</label>
                    <textarea
                      value={createForm.description}
                      onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                      placeholder="Business purpose of this expense..."
                      className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                      rows={3}
                    />
                  </div>

                  {selectedCategoryObj && (selectedCategoryObj.requireReceipt || selectedCategoryObj.maxLimit) && (
                    <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs flex gap-2 items-start">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <span className="font-semibold block">Category Rules:</span>
                        {selectedCategoryObj.requireReceipt && <span className="block">• Receipt attachment is MANDATORY for submission.</span>}
                        {selectedCategoryObj.maxLimit && <span className="block">• Limit: Expenses cannot exceed {orgCurrency} {selectedCategoryObj.maxLimit.toLocaleString()}.</span>}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3: Receipt Attachment & Drag & Drop */}
              {currentStep === 3 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Receipt Attachments</label>
                  
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`mt-2 border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer relative transition-all duration-200 ${
                      isDragOver
                        ? 'border-cyan-500 bg-cyan-500/5'
                        : createForm.receiptUrls.length > 0
                        ? 'border-emerald-500/40 bg-emerald-500/5'
                        : 'border-white/10 hover:border-white/20 bg-white/5'
                    }`}
                  >
                    <input
                      type="file"
                      multiple
                      onChange={async (e) => {
                        if (e.target.files) {
                          for (let i = 0; i < e.target.files.length; i++) {
                            await handleFileUpload(e.target.files[i]);
                          }
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    
                    <Upload className="h-8 w-8 text-slate-500 mb-2" />
                    <span className="text-xs text-slate-400 font-semibold">Drag and drop files here, or click to upload</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">Supports PDF, PNG, JPG (Multiple Uploads Allowed)</span>
                  </div>

                  {createForm.receiptUrls && createForm.receiptUrls.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Uploaded Files ({createForm.receiptUrls.length})</span>
                      <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                        {createForm.receiptUrls.map((url, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-white/5 text-xs text-slate-300">
                            <span className="truncate max-w-[280px] font-mono">{url.split('/').pop()}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setCreateForm(prev => {
                                  const updatedUrls = prev.receiptUrls.filter((_, i) => i !== idx);
                                  return {
                                    ...prev,
                                    receiptUrls: updatedUrls,
                                    receiptUrl: updatedUrls[0] || '',
                                  };
                                });
                              }}
                              className="text-red-400 hover:text-red-350 p-1"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedCategoryObj?.requireReceipt && createForm.receiptUrls.length === 0 && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex gap-2 items-center">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span>Submission requires at least one receipt attachment for this category.</span>
                    </div>
                  )}
                </div>
              )}

              {/* Navigation Actions */}
              <div className="flex justify-between items-center pt-4 border-t border-white/5">
                <div>
                  {currentStep > 1 && (
                    <button
                      type="button"
                      onClick={() => setCurrentStep((prev) => prev - 1)}
                      className="flex items-center px-4 py-2 rounded-lg border border-white/10 hover:bg-white/5 text-slate-200 text-sm font-semibold transition-colors"
                    >
                      <ChevronLeft className="mr-1.5 h-4 w-4" />
                      Back
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCreateModalOpen(false)}
                    className="px-4 py-2 rounded-lg border border-white/10 hover:bg-white/5 text-slate-200 text-sm font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  
                  {currentStep < 3 ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (currentStep === 1 && (!createForm.merchant || !createForm.amount)) {
                          setError('Merchant name and Amount are required');
                          return;
                        }
                        setError('');
                        setCurrentStep((prev) => prev + 1);
                      }}
                      className="flex items-center px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm font-semibold transition-colors"
                    >
                      Next
                      <ChevronRight className="ml-1.5 h-4 w-4" />
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={(e) => editingClaimId ? handleUpdateSubmit(e, 'draft') : handleCreateSubmit(e, 'draft')}
                        disabled={createSubmitting}
                        className="flex items-center justify-center px-4 py-2 rounded-lg border border-cyan-500/30 hover:bg-cyan-500/5 text-cyan-400 text-sm font-semibold transition-colors disabled:opacity-50"
                      >
                        {createSubmitting && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                        Save Draft
                      </button>
                      <button
                        type="button"
                        onClick={(e) => editingClaimId ? handleUpdateSubmit(e, 'submitted') : handleCreateSubmit(e, 'submitted')}
                        disabled={createSubmitting || (selectedCategoryObj?.requireReceipt && createForm.receiptUrls.length === 0)}
                        className={`flex items-center justify-center px-5 py-2 rounded-lg font-semibold transition-colors text-sm disabled:opacity-50 ${
                          selectedCategoryObj?.requireReceipt && createForm.receiptUrls.length === 0
                            ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                            : 'bg-cyan-500 hover:bg-cyan-600 text-slate-950'
                        }`}
                      >
                        {createSubmitting && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                        {createSubmitting ? 'Submitting...' : 'Submit Claim'}
                      </button>
                    </>
                  )}
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Lightbox Receipt Image Previewer */}
      {previewUrl && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 p-4">
          <div className="absolute top-4 right-4 flex items-center space-x-3 z-50">
            <button
              onClick={() => setZoomScale((z) => Math.min(4, z + 0.25))}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 border border-white/10 text-white rounded-lg text-xs font-semibold transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="h-4 w-4" />
              Zoom In
            </button>
            <button
              onClick={() => setZoomScale((z) => Math.max(0.5, z - 0.25))}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 border border-white/10 text-white rounded-lg text-xs font-semibold transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="h-4 w-4" />
              Zoom Out
            </button>
            <button
              onClick={() => setRotationAngle((r) => r + 90)}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 border border-white/10 text-white rounded-lg text-xs font-semibold transition-colors"
              title="Rotate"
            >
              <RotateCw className="h-4 w-4" />
              Rotate
            </button>
            <button
              onClick={() => {
                setZoomScale(1);
                setRotationAngle(0);
              }}
              className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 border border-white/10 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              Reset
            </button>
            <button
              onClick={() => setPreviewUrl(null)}
              className="flex items-center gap-1 px-3 py-1.5 bg-red-650 hover:bg-red-600 border border-red-500/20 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              <X className="h-4 w-4" />
              Close
            </button>
          </div>

          <div className="relative max-w-full max-h-[85vh] overflow-hidden flex items-center justify-center p-8">
            {previewUrl.toLowerCase().endsWith('.pdf') ? (
              <iframe src={previewUrl} className="w-[80vw] h-[80vh] border-0 rounded-lg shadow-2xl bg-white" />
            ) : (
              <img
                src={previewUrl}
                alt="Receipt Preview"
                style={{
                  transform: `scale(${zoomScale}) rotate(${rotationAngle}deg)`,
                  transition: 'transform 0.2s ease-in-out',
                }}
                className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
