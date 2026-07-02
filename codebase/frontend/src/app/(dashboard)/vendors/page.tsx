'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { UserPlus, ShieldAlert, Phone, Mail, FileText, Landmark, RefreshCw, X, Check, Building } from 'lucide-react';

interface ProjectOption {
  _id: string;
  name: string;
  code: string;
}

interface VendorItem {
  _id: string;
  name: string;
  company: string;
  gstPan?: string;
  contactEmail?: string;
  contactPhone?: string;
  bankName?: string;
  bankAccount?: string;
  bankIfsc?: string;
  status: 'active' | 'inactive';
  projects: ProjectOption[] | string[];
}

export default function VendorsPage() {
  const { user: currentUser } = useAuthStore();
  const isAdmin = currentUser?.role === 'Administrator' || currentUser?.role === 'Organization Admin' || currentUser?.role?.includes('Admin');

  const [vendors, setVendors] = useState<VendorItem[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<VendorItem | null>(null);

  // Forms
  const [createForm, setCreateForm] = useState({
    name: '',
    company: '',
    gstPan: '',
    contactEmail: '',
    contactPhone: '',
    bankName: '',
    bankAccount: '',
    bankIfsc: '',
    status: 'active',
  });
  const [createSubmitting, setCreateSubmitting] = useState(false);

  // Project linkage state
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [linkSubmitting, setLinkSubmitting] = useState(false);

  const loadVendors = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/vendors');
      setVendors(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load vendors');
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async () => {
    try {
      const response = await api.get('/projects');
      setProjects(response.data);
    } catch (err) {
      console.error('Failed to load projects list', err);
    }
  };

  useEffect(() => {
    loadVendors();
    loadProjects();
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    setCreateSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post('/vendors', createForm);
      setSuccess('Vendor profile created successfully');
      setVendors((prev) => [...prev, response.data]);
      setCreateModalOpen(false);
      setCreateForm({
        name: '',
        company: '',
        gstPan: '',
        contactEmail: '',
        contactPhone: '',
        bankName: '',
        bankAccount: '',
        bankIfsc: '',
        status: 'active',
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create vendor');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const openLinkModal = async (vendor: VendorItem) => {
    setSelectedVendor(vendor);
    try {
      // Fetch full details of the vendor to see populated projects list
      const response = await api.get(`/vendors/${vendor._id}`);
      const fullVendor = response.data;
      const projIds = fullVendor.projects.map((p: any) => p._id || p);
      setSelectedProjectIds(projIds);
      setLinkModalOpen(true);
    } catch (err) {
      console.error('Failed to load vendor details', err);
    }
  };

  const handleLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !selectedVendor) return;

    setLinkSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await api.post(`/vendors/${selectedVendor._id}/link-projects`, {
        projectIds: selectedProjectIds,
      });
      setSuccess('Vendor project links updated successfully');
      setLinkModalOpen(false);
      loadVendors();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update vendor project link context');
    } finally {
      setLinkSubmitting(false);
    }
  };

  const toggleProjectSelection = (projectId: string) => {
    setSelectedProjectIds((prev) =>
      prev.includes(projectId) ? prev.filter((id) => id !== projectId) : [...prev, projectId]
    );
  };

  if (loading) {
    return (
      <div className="flex h-[75vh] items-center justify-center">
        <div className="flex flex-col items-center space-y-2 text-slate-400">
          <RefreshCw className="h-8 w-8 animate-spin text-cyan-400" />
          <span className="text-sm">Retrieving vendor credentials directory...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Title Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Vendor Directory</h1>
          <p className="text-sm text-slate-400">View PAN/GST registration numbers, bank coordinates, and project context link mappings.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={loadVendors}
            className="p-2 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-all duration-200"
            title="Reload"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          {isAdmin && (
            <button
              onClick={() => setCreateModalOpen(true)}
              className="flex items-center px-4 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-semibold transition-all duration-200 shadow-lg shadow-cyan-500/25 text-sm"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Add Vendor
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

      {/* Grid of Vendors */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[300px] text-slate-400">
          <p className="text-sm">Loading vendor profiles...</p>
        </div>
      ) : vendors.length === 0 ? (
        <div className="text-center p-12 rounded-xl border border-white/5 bg-[#0b0f19]/30 text-slate-400 text-sm">
          No vendors registered in organization workspace directory.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {vendors.map((vendor) => (
            <div
              key={vendor._id}
              className="rounded-xl border border-white/5 bg-[#0b0f19]/60 backdrop-blur-md p-6 shadow-lg hover:border-white/10 transition-all duration-300 space-y-4"
            >
              {/* Card Header */}
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight">{vendor.name}</h3>
                  <p className="text-xs text-slate-400 font-semibold">{vendor.company}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase ${
                  vendor.status === 'active'
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                    : 'bg-red-500/10 border border-red-500/20 text-red-400'
                }`}>
                  {vendor.status}
                </span>
              </div>

              {/* Tax & Contact Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-500 flex-shrink-0" />
                  <span className="truncate">GST/PAN: {vendor.gstPan || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-slate-500 flex-shrink-0" />
                  <span className="truncate" title={vendor.contactEmail}>{vendor.contactEmail || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-slate-500 flex-shrink-0" />
                  <span className="truncate">{vendor.contactPhone || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Landmark className="h-4 w-4 text-slate-500 flex-shrink-0" />
                  <span className="truncate" title={`${vendor.bankName} - ${vendor.bankAccount}`}>
                    {vendor.bankName ? `${vendor.bankName} (${vendor.bankIfsc})` : 'No Bank Coordinates'}
                  </span>
                </div>
              </div>

              {/* Linked Projects list */}
              <div className="pt-3 border-t border-white/5">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Linked project links:</span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {vendor.projects.length === 0 ? (
                    <span className="text-xs text-slate-600">No projects linked</span>
                  ) : (
                    vendor.projects.map((proj: any) => (
                      <span
                        key={proj._id || proj}
                        className="px-2 py-0.5 rounded bg-cyan-500/5 border border-cyan-500/20 text-cyan-400 text-[10px] font-medium"
                      >
                        {proj.name || proj}
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* Actions */}
              {isAdmin && (
                <div className="pt-3 border-t border-white/5 flex justify-end">
                  <button
                    onClick={() => openLinkModal(vendor)}
                    className="flex items-center text-xs font-semibold text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/5 px-3 py-1.5 rounded-lg border border-cyan-500/25 transition-all duration-200"
                  >
                    <Building className="mr-1.5 h-3.5 w-3.5" />
                    Link Projects
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Creation Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setCreateModalOpen(false)} />
          <div className="relative w-full max-w-lg rounded-xl border border-white/5 bg-[#0b0f19] p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-white">Add New Vendor</h3>
              <button onClick={() => setCreateModalOpen(false)} className="text-slate-500 hover:text-slate-300">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Vendor Name</label>
                  <input
                    type="text"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    placeholder="Acme Office Supplies"
                    className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Company Legal Name</label>
                  <input
                    type="text"
                    value={createForm.company}
                    onChange={(e) => setCreateForm({ ...createForm, company: e.target.value })}
                    placeholder="Acme Trading Ltd"
                    className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">GSTIN / PAN</label>
                  <input
                    type="text"
                    value={createForm.gstPan}
                    onChange={(e) => setCreateForm({ ...createForm, gstPan: e.target.value })}
                    placeholder="22AAAAA0000A1Z1"
                    className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Contact Email</label>
                  <input
                    type="email"
                    value={createForm.contactEmail}
                    onChange={(e) => setCreateForm({ ...createForm, contactEmail: e.target.value })}
                    placeholder="billing@acme.com"
                    className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Contact Phone</label>
                  <input
                    type="text"
                    value={createForm.contactPhone}
                    onChange={(e) => setCreateForm({ ...createForm, contactPhone: e.target.value })}
                    placeholder="+1 555 0199"
                    className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Bank Name</label>
                  <input
                    type="text"
                    value={createForm.bankName}
                    onChange={(e) => setCreateForm({ ...createForm, bankName: e.target.value })}
                    placeholder="Sovereign Bank"
                    className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Bank Account No</label>
                  <input
                    type="text"
                    value={createForm.bankAccount}
                    onChange={(e) => setCreateForm({ ...createForm, bankAccount: e.target.value })}
                    placeholder="9988776655"
                    className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Bank IFSC / SWIFT</label>
                  <input
                    type="text"
                    value={createForm.bankIfsc}
                    onChange={(e) => setCreateForm({ ...createForm, bankIfsc: e.target.value })}
                    placeholder="SOV0001"
                    className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
                  />
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
                  type="submit"
                  disabled={createSubmitting}
                  className="px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-semibold transition-colors text-sm"
                >
                  {createSubmitting ? 'Creating...' : 'Create Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Link Projects Modal */}
      {linkModalOpen && selectedVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setLinkModalOpen(false)} />
          <div className="relative w-full max-w-md rounded-xl border border-white/5 bg-[#0b0f19] p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-white">Link Projects to Vendor</h3>
                <p className="text-xs text-slate-500">{selectedVendor.name}</p>
              </div>
              <button onClick={() => setLinkModalOpen(false)} className="text-slate-500 hover:text-slate-300">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleLinkSubmit} className="space-y-4">
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                {projects.map((proj) => {
                  const selected = selectedProjectIds.includes(proj._id);
                  return (
                    <div
                      key={`link-proj-${proj._id}`}
                      onClick={() => toggleProjectSelection(proj._id)}
                      className={`flex items-center justify-between p-3 rounded-lg border text-sm cursor-pointer transition-all ${
                        selected
                          ? 'bg-cyan-500/10 border-cyan-500/30 text-white'
                          : 'bg-white/5 border-transparent text-slate-400 hover:bg-white/10 hover:text-slate-200'
                      }`}
                    >
                      <div>
                        <p className="font-semibold text-slate-200">{proj.name}</p>
                        <p className="text-[10px] text-slate-500 font-mono uppercase">{proj.code}</p>
                      </div>
                      {selected && <Check className="h-4 w-4 text-cyan-400" />}
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setLinkModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-white/10 hover:bg-white/5 text-slate-200 text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={linkSubmitting}
                  className="px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-semibold transition-colors text-sm"
                >
                  {linkSubmitting ? 'Linking...' : 'Save Mappings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
