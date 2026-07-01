'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { Landmark, AlertTriangle, Coins, RefreshCw, X, PlusCircle, Check, Play } from 'lucide-react';

interface ProjectOption {
  _id: string;
  name: string;
  code: string;
}

interface BudgetCardItem {
  _id: string;
  scope: 'organization' | 'project';
  amount: number;
  spent: number;
  currency: string;
  startDate: string;
  endDate: string;
  thresholds: number[];
  alertedThresholds: number[];
  status: 'active' | 'inactive';
  project?: string;
}

interface AlertLogItem {
  _id: string;
  budget: { _id: string; scope: string } | string;
  project?: { _id: string; name: string; code: string } | string;
  threshold: number;
  percentage: number;
  amount: number;
  spent: number;
  createdAt: string;
}

export default function BudgetsPage() {
  const { user: currentUser } = useAuthStore();
  const isAdmin = currentUser?.role === 'Administrator' || currentUser?.role === 'Organization Admin' || currentUser?.role?.includes('Admin');

  const [budgets, setBudgets] = useState<BudgetCardItem[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [alerts, setAlerts] = useState<AlertLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [spentModalOpen, setSpentModalOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<BudgetCardItem | null>(null);

  // Forms
  const [createForm, setCreateForm] = useState({
    scope: 'project',
    project: '',
    amount: 0,
    currency: 'USD',
    startDate: '',
    endDate: '',
    thresholds: '80, 100',
  });
  const [createSubmitting, setCreateSubmitting] = useState(false);

  const [simSpentAmount, setSimSpentAmount] = useState(1000);
  const [simSubmitting, setSimSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [budgetsRes, projectsRes, alertsRes] = await Promise.all([
        api.get('/budgets'),
        api.get('/projects'),
        api.get('/budgets/alerts'),
      ]);
      setBudgets(budgetsRes.data);
      setProjects(projectsRes.data);
      setAlerts(alertsRes.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load budget parameters');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    setCreateSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const threshArray = createForm.thresholds
        .split(',')
        .map((t) => Number(t.trim()))
        .filter((t) => !isNaN(t));

      const response = await api.post('/budgets', {
        scope: createForm.scope,
        project: createForm.scope === 'project' ? createForm.project : undefined,
        amount: Number(createForm.amount),
        currency: createForm.currency,
        startDate: new Date(createForm.startDate).toISOString(),
        endDate: new Date(createForm.endDate).toISOString(),
        thresholds: threshArray.length > 0 ? threshArray : [80, 100],
      });

      setSuccess('Budget allocated successfully');
      setCreateModalOpen(false);
      setCreateForm({
        scope: 'project',
        project: '',
        amount: 0,
        currency: 'USD',
        startDate: '',
        endDate: '',
        thresholds: '80, 100',
      });
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to allocate budget');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleSimSpentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBudget) return;

    setSimSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await api.post(`/budgets/${selectedBudget._id}/spent`, {
        amount: Number(simSpentAmount),
      });
      setSuccess(`Successfully simulated spent increment of ${simSpentAmount} ${selectedBudget.currency}`);
      setSpentModalOpen(false);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update spent amount');
    } finally {
      setSimSubmitting(false);
    }
  };

  const orgBudget = budgets.find((b) => b.scope === 'organization' && b.status === 'active');
  const projectBudgets = budgets.filter((b) => b.scope === 'project');

  // Overall statistics
  const totalOrgBudgetAmount = orgBudget?.amount || 0;
  const totalAllocatedToProjects = projectBudgets.reduce((sum, b) => sum + b.amount, 0);
  const totalSpentAcrossProjects = projectBudgets.reduce((sum, b) => sum + b.spent, 0);
  const remainingOrgBuffer = totalOrgBudgetAmount - totalAllocatedToProjects;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Title Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Budget & Expense Alerting</h1>
          <p className="text-sm text-slate-400">Establish organization caps, configure project limits, and log threshold alerts.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={loadData}
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
              <PlusCircle className="mr-2 h-4 w-4" />
              Configure Budget
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="rounded-xl border border-white/5 bg-[#0b0f19]/60 p-5 space-y-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Company Budget Cap</span>
          <p className="text-2xl font-extrabold text-white">
            {totalOrgBudgetAmount.toLocaleString(undefined, { style: 'currency', currency: orgBudget?.currency || 'USD' })}
          </p>
          <p className="text-[10px] text-slate-500">
            {orgBudget ? `Period: ${new Date(orgBudget.startDate).toLocaleDateString()} - ${new Date(orgBudget.endDate).toLocaleDateString()}` : 'No active Org Budget'}
          </p>
        </div>

        <div className="rounded-xl border border-white/5 bg-[#0b0f19]/60 p-5 space-y-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Allocated to Projects</span>
          <p className="text-2xl font-extrabold text-cyan-400">
            {totalAllocatedToProjects.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}
          </p>
          <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-cyan-500 h-full"
              style={{ width: `${totalOrgBudgetAmount ? Math.min(100, (totalAllocatedToProjects / totalOrgBudgetAmount) * 100) : 0}%` }}
            />
          </div>
        </div>

        <div className="rounded-xl border border-white/5 bg-[#0b0f19]/60 p-5 space-y-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Spent (Projects)</span>
          <p className="text-2xl font-extrabold text-amber-400">
            {totalSpentAcrossProjects.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}
          </p>
          <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-amber-500 h-full"
              style={{ width: `${totalAllocatedToProjects ? Math.min(100, (totalSpentAcrossProjects / totalAllocatedToProjects) * 100) : 0}%` }}
            />
          </div>
        </div>

        <div className="rounded-xl border border-white/5 bg-[#0b0f19]/60 p-5 space-y-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Remaining Buffer Cap</span>
          <p className="text-2xl font-extrabold text-emerald-400">
            {remainingOrgBuffer.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}
          </p>
          <p className="text-[10px] text-slate-500">Unallocated organization balance</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project allocations & sliders */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-white/5 bg-[#0b0f19]/40 p-6 space-y-4">
            <h3 className="text-md font-bold text-white tracking-tight flex items-center gap-2">
              <Coins className="h-4 w-4 text-cyan-400" />
              Project Allocation Details
            </h3>

            {loading ? (
              <p className="text-sm text-slate-500">Loading allocations...</p>
            ) : projectBudgets.length === 0 ? (
              <p className="text-sm text-slate-500">No project allocations configured.</p>
            ) : (
              <div className="space-y-4">
                {projectBudgets.map((pb) => {
                  const proj = projects.find((p) => p._id === pb.project);
                  const percentage = pb.amount ? (pb.spent / pb.amount) * 100 : 0;
                  return (
                    <div key={pb._id} className="p-4 rounded-lg border border-white/5 bg-white/5 hover:border-white/10 transition-all duration-200 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-semibold text-white">{proj?.name || 'Project Name'}</p>
                          <p className="text-[10px] text-slate-500 font-mono uppercase">Code: {proj?.code || 'ORN'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-400">
                            Spent: <span className="font-semibold text-slate-200">{pb.spent.toLocaleString()}</span> / {pb.amount.toLocaleString()} {pb.currency}
                          </p>
                          <p className="text-[10px] text-slate-500">{percentage.toFixed(1)}% Used</p>
                        </div>
                      </div>

                      {/* Health progress bar */}
                      <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/5">
                        <div
                          className={`h-full transition-all duration-300 ${
                            percentage >= 100 ? 'bg-red-500' : percentage >= 80 ? 'bg-amber-500' : 'bg-cyan-500'
                          }`}
                          style={{ width: `${Math.min(100, percentage)}%` }}
                        />
                      </div>

                      <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1">
                        <span>Alert Thresholds: {pb.thresholds.join('%, ')}%</span>
                        <button
                          onClick={() => {
                            setSelectedBudget(pb);
                            setSpentModalOpen(true);
                          }}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/25 transition-all"
                        >
                          <Play className="h-3 w-3" />
                          Simulate Spent
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Real-time Alerts feed */}
        <div className="space-y-6">
          <div className="rounded-xl border border-white/5 bg-[#0b0f19]/40 p-6 space-y-4">
            <h3 className="text-md font-bold text-white tracking-tight flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Real-Time Alert Feed
            </h3>

            {loading ? (
              <p className="text-sm text-slate-500">Loading alerts...</p>
            ) : alerts.length === 0 ? (
              <p className="text-xs text-slate-600 text-center p-8 border border-dashed border-white/5 rounded-lg">
                No budget alerts triggered yet. Enforce allocations and run spent updates to test limit dispatches.
              </p>
            ) : (
              <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
                {alerts.map((al) => {
                  const proj = typeof al.project === 'object' ? al.project : projects.find((p) => p._id === al.project);
                  return (
                    <div
                      key={al._id}
                      className="p-3 rounded-lg border border-red-500/20 bg-red-500/5 text-xs text-slate-300 space-y-2 animate-in fade-in duration-300"
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-red-400 uppercase tracking-wider text-[9px] bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded">
                          ALERT {al.threshold}%
                        </span>
                        <span className="text-[9px] text-slate-500">{new Date(al.createdAt).toLocaleTimeString()}</span>
                      </div>
                      <p>
                        Project <span className="font-bold text-slate-200">{proj?.name || 'Project'}</span> has breached its alert threshold!
                      </p>
                      <div className="flex justify-between text-[10px] text-slate-400 bg-white/5 p-1.5 rounded font-mono">
                        <span>Spent: {al.spent.toLocaleString()}</span>
                        <span>Percentage: {al.percentage.toFixed(1)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Allocation creation modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setCreateModalOpen(false)} />
          <div className="relative w-full max-w-lg rounded-xl border border-white/5 bg-[#0b0f19] p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-white">Configure Budget Allocation</h3>
              <button onClick={() => setCreateModalOpen(false)} className="text-slate-500 hover:text-slate-300">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Budget Scope</label>
                <select
                  value={createForm.scope}
                  onChange={(e) => setCreateForm({ ...createForm, scope: e.target.value })}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-[#0c1020] px-4 py-2.5 text-sm text-white focus:border-cyan-500"
                >
                  <option value="project">Project Allocation</option>
                  <option value="organization">Organization Budget Cap</option>
                </select>
              </div>

              {createForm.scope === 'project' && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Link Project</label>
                  <select
                    value={createForm.project}
                    onChange={(e) => setCreateForm({ ...createForm, project: e.target.value })}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-[#0c1020] px-4 py-2.5 text-sm text-white focus:border-cyan-500"
                    required
                  >
                    <option value="">Select Project...</option>
                    {projects.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name} ({p.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Total Cap Amount</label>
                  <input
                    type="number"
                    value={createForm.amount}
                    onChange={(e) => setCreateForm({ ...createForm, amount: Number(e.target.value) })}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-cyan-500"
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
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Start Date</label>
                  <input
                    type="date"
                    value={createForm.startDate}
                    onChange={(e) => setCreateForm({ ...createForm, startDate: e.target.value })}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-[#0c1020] px-4 py-2.5 text-sm text-white focus:border-cyan-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">End Date</label>
                  <input
                    type="date"
                    value={createForm.endDate}
                    onChange={(e) => setCreateForm({ ...createForm, endDate: e.target.value })}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-[#0c1020] px-4 py-2.5 text-sm text-white focus:border-cyan-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Alert Thresholds (%)</label>
                <input
                  type="text"
                  value={createForm.thresholds}
                  onChange={(e) => setCreateForm({ ...createForm, thresholds: e.target.value })}
                  placeholder="80, 100"
                  className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500 block mt-1">Comma-separated percentages to alert. (e.g. 80, 90, 100)</span>
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
                  {createSubmitting ? 'Configuring...' : 'Allocate Budget'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Spent simulation modal */}
      {spentModalOpen && selectedBudget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSpentModalOpen(false)} />
          <div className="relative w-full max-w-sm rounded-xl border border-white/5 bg-[#0b0f19] p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-white">Simulate Expense Spent</h3>
                <p className="text-xs text-slate-500">Add spent increment to budget cap</p>
              </div>
              <button onClick={() => setSpentModalOpen(false)} className="text-slate-500 hover:text-slate-300">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSimSpentSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Expense Spent Increment</label>
                <input
                  type="number"
                  value={simSpentAmount}
                  onChange={(e) => setSimSpentAmount(Number(e.target.value))}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-cyan-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setSpentModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-white/10 hover:bg-white/5 text-slate-200 text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={simSubmitting}
                  className="px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-semibold transition-colors text-sm"
                >
                  {simSubmitting ? 'Updating...' : 'Update Spent'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
