'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { Trash2, Plus, RefreshCw, Briefcase, Building } from 'lucide-react';

interface Item {
  _id: string;
  name: string;
  code: string;
}

export default function DepartmentsDesignationsPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'departments' | 'designations'>('departments');
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [code, setCode] = useState('');

  const isAdmin = user?.role === 'Administrator' || user?.role === 'Organization Admin' || user?.role?.includes('Admin');

  const loadItems = async () => {
    setLoading(true);
    setError('');
    try {
      const endpoint = activeTab === 'departments' ? '/departments' : '/designations';
      const response = await api.get(endpoint);
      setItems(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load entries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
    setName('');
    setCode('');
    setSuccess('');
    setError('');
  }, [activeTab]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const endpoint = activeTab === 'departments' ? '/departments' : '/designations';
      const response = await api.post(endpoint, { name, code: code.toUpperCase() });
      setSuccess(`Created successfully`);
      setItems((prev) => [...prev, response.data]);
      setName('');
      setCode('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create entry');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    if (!confirm('Are you sure you want to delete this item?')) return;

    setError('');
    setSuccess('');

    try {
      const endpoint = activeTab === 'departments' ? `/departments/${id}` : `/designations/${id}`;
      await api.delete(endpoint);
      setSuccess('Deleted successfully');
      setItems((prev) => prev.filter((item) => item._id !== id));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete entry');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Departments & Designations</h1>
          <p className="text-sm text-slate-400">Configure corporate department sectors and job titles for user profiles.</p>
        </div>
        <button
          onClick={loadItems}
          className="p-2 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-all duration-200"
          title="Reload"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10">
        <button
          onClick={() => setActiveTab('departments')}
          className={`flex items-center px-6 py-3 border-b-2 font-medium text-sm transition-all duration-200 ${
            activeTab === 'departments'
              ? 'border-cyan-500 text-cyan-400'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-white/10'
          }`}
        >
          <Building className="mr-2 h-4 w-4" />
          Departments
        </button>
        <button
          onClick={() => setActiveTab('designations')}
          className={`flex items-center px-6 py-3 border-b-2 font-medium text-sm transition-all duration-200 ${
            activeTab === 'designations'
              ? 'border-cyan-500 text-cyan-400'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-white/10'
          }`}
        >
          <Briefcase className="mr-2 h-4 w-4" />
          Designations
        </button>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Creator Form Panel */}
        <div className="md:col-span-1">
          {isAdmin ? (
            <div className="rounded-xl border border-white/5 bg-[#0b0f19]/60 backdrop-blur-md p-6 shadow-lg space-y-4">
              <h3 className="text-lg font-semibold text-white">
                Add {activeTab === 'departments' ? 'Department' : 'Designation'}
              </h3>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={submitting}
                    placeholder={activeTab === 'departments' ? 'Engineering' : 'Software Engineer'}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Code</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    disabled={submitting}
                    placeholder={activeTab === 'departments' ? 'ENG' : 'SWE'}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-50 uppercase"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center px-4 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-semibold transition-all duration-200 shadow-lg shadow-cyan-500/25 text-sm disabled:opacity-50"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {submitting ? 'Creating...' : 'Create'}
                </button>
              </form>
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-white/5 bg-[#0b0f19]/30 text-amber-400 text-sm">
              Requires administrative access to create entries.
            </div>
          )}
        </div>

        {/* List Panel */}
        <div className="md:col-span-2">
          <div className="rounded-xl border border-white/5 bg-[#0b0f19]/60 backdrop-blur-md overflow-hidden shadow-lg">
            {loading ? (
              <div className="p-12 text-center text-slate-400 text-sm">
                Loading list items...
              </div>
            ) : items.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm">
                No {activeTab} configured yet.
              </div>
            ) : (
              <table className="min-w-full divide-y divide-white/5">
                <thead className="bg-[#0c1020]">
                  <tr>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Name</th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Code</th>
                    {isAdmin && (
                      <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 bg-transparent">
                  {items.map((item) => (
                    <tr key={item._id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{item.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-cyan-400 font-mono">{item.code}</td>
                      {isAdmin && (
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          <button
                            onClick={() => handleDelete(item._id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
