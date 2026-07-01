'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { Building2, Save, Link as LinkIcon, MapPin, Globe } from 'lucide-react';

export default function OrganizationSettingsPage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    name: '',
    slug: '',
    website: '',
    address: '',
    currency: 'USD',
    timezone: 'UTC',
  });

  // Check if current user has settings edit capability
  const isAdmin = user?.role === 'Administrator' || user?.role === 'Organization Admin' || user?.role?.includes('Admin');

  useEffect(() => {
    async function loadOrg() {
      try {
        const response = await api.get('/organizations/profile');
        setForm({
          name: response.data.name || '',
          slug: response.data.slug || '',
          website: response.data.website || '',
          address: response.data.address || '',
          currency: response.data.currency || 'USD',
          timezone: response.data.timezone || 'UTC',
        });
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load organization profile');
      } finally {
        setLoading(false);
      }
    }
    loadOrg();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.patch('/organizations/profile', {
        name: form.name,
        website: form.website,
        address: form.address,
        currency: form.currency,
        timezone: form.timezone,
      });
      setSuccess('Organization profile updated successfully');
      setForm((prev) => ({ ...prev, name: response.data.name }));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update organization profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-slate-400">
        <p className="text-sm">Loading profile settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Organization Profile</h1>
        <p className="text-sm text-slate-400">Update your company general metadata, slug, and operational currency settings.</p>
      </div>

      <div className="rounded-xl border border-white/5 bg-[#0b0f19]/60 backdrop-blur-md p-6 shadow-lg">
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-slate-300">Organization Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                disabled={!isAdmin || saving}
                className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-50"
                placeholder="Acme Corp"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300">Organization Slug (Read-only)</label>
              <input
                type="text"
                value={form.slug}
                disabled
                className="mt-2 w-full rounded-lg border border-white/5 bg-[#070911] px-4 py-2.5 text-sm text-slate-400 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300">Website URL</label>
              <div className="relative mt-2 rounded-lg">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <Globe className="h-4 w-4" />
                </div>
                <input
                  type="url"
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                  disabled={!isAdmin || saving}
                  className="w-full rounded-lg border border-white/10 bg-white/5 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-50"
                  placeholder="https://acme.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300">Default Currency</label>
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                disabled={!isAdmin || saving}
                className="mt-2 w-full rounded-lg border border-white/10 bg-[#0c1020] px-4 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-50"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="INR">INR (₹)</option>
                <option value="CAD">CAD ($)</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-slate-300">Office Address</label>
              <div className="relative mt-2 rounded-lg">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <MapPin className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  disabled={!isAdmin || saving}
                  className="w-full rounded-lg border border-white/10 bg-white/5 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-50"
                  placeholder="123 Corporate Blvd, Suite 100"
                />
              </div>
            </div>
          </div>

          {isAdmin ? (
            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-semibold transition-all duration-200 shadow-lg shadow-cyan-500/25 text-sm disabled:opacity-50"
              >
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Saving changes...' : 'Save Settings'}
              </button>
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm">
              You do not have administrative permissions to modify organization settings.
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
