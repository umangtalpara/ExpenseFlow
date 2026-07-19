'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useOrgStore } from '@/store/org.store';
import { FolderPlus, Users, Calendar, DollarSign, RefreshCw, X, ShieldAlert, Check, Plus, AlertTriangle, Edit } from 'lucide-react';

interface UserOption {
  _id: string;
  name: string;
  email: string;
}

interface ProjectItem {
  _id: string;
  name: string;
  code: string;
  client: string;
  budget: number;
  currency: string;
  startDate?: string;
  endDate?: string;
  status: 'active' | 'inactive' | 'completed' | 'on-hold';
  projectManagers: UserOption[] | string[];
  employees: UserOption[] | string[];
  approvalFlow?: {
    _id: string;
    name: string;
  } | string;
}

export default function ProjectsPage() {
  const { user: currentUser } = useAuthStore();
  const isAdmin = currentUser?.role === 'Administrator' || currentUser?.role === 'Organization Admin' || currentUser?.role?.includes('Admin');

  const { currency: orgCurrency } = useOrgStore();

  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [allUsers, setAllUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);

  // Budget validation alerts
  const [budgetWarningOpen, setBudgetWarningOpen] = useState(false);
  const [budgetWarningMsg, setBudgetWarningMsg] = useState('');
  const [onConfirmBudgetWarning, setOnConfirmBudgetWarning] = useState<(() => void) | null>(null);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [membersModalOpen, setMembersModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectItem | null>(null);
  const [directExpenseModalOpen, setDirectExpenseModalOpen] = useState(false);
  const [directExpenseSubmitting, setDirectExpenseSubmitting] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);

  // Forms
  const [directExpenseForm, setDirectExpenseForm] = useState({
    employee: '',
    merchant: '',
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    category: '',
    paymentMethod: '',
    description: '',
  });

  const [createForm, setCreateForm] = useState({
    name: '',
    code: '',
    client: '',
    budget: 0,
    currency: 'USD',
    startDate: '',
    endDate: '',
    status: 'active',
    approvalFlow: '',
  });

  useEffect(() => {
    if (orgCurrency) {
      setCreateForm((f) => ({ ...f, currency: orgCurrency }));
    }
  }, [orgCurrency]);

  const [createSubmitting, setCreateSubmitting] = useState(false);

  // Edit Project States
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    code: '',
    client: '',
    budget: 0,
    startDate: '',
    endDate: '',
    status: 'active' as any,
    approvalFlow: '',
  });

  const openEditModal = (project: ProjectItem) => {
    setSelectedProject(project);
    setEditForm({
      name: project.name,
      code: project.code,
      client: project.client,
      budget: project.budget,
      startDate: project.startDate ? project.startDate.split('T')[0] : '',
      endDate: project.endDate ? project.endDate.split('T')[0] : '',
      status: project.status,
      approvalFlow: typeof project.approvalFlow === 'object' ? (project.approvalFlow as any)?._id : (project.approvalFlow || ''),
    });
    setEditModalOpen(true);
  };

  const checkBudgetLimit = (budgetAmount: number, startDateStr: string, endDateStr: string) => {
    const start = startDateStr ? new Date(startDateStr) : new Date();
    const end = endDateStr ? new Date(endDateStr) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    const orgBudget = budgets.find(
      (b) =>
        b.scope === 'organization' &&
        b.status === 'active' &&
        new Date(b.startDate) <= start &&
        new Date(b.endDate) >= end
    );

    if (!orgBudget) {
      return {
        warning: true,
        message: 'There is no active organization budget covering this project period. Creating this project will bypass the check.',
      };
    }

    // Sum other project budgets in this period
    const existingProjectBudgets = budgets.filter(
      (b) =>
        b.scope === 'project' &&
        b.status === 'active' &&
        new Date(b.startDate) >= new Date(orgBudget.startDate) &&
        new Date(b.endDate) <= new Date(orgBudget.endDate)
    );

    const currentAllocated = existingProjectBudgets.reduce((sum, b) => sum + b.amount, 0);

    if (currentAllocated + budgetAmount > orgBudget.amount) {
      return {
        warning: true,
        message: `Project budget allocation exceeds organization budget ceiling. Available remaining: ${(orgBudget.amount - currentAllocated).toLocaleString()} ${orgBudget.currency}. Requested: ${budgetAmount.toLocaleString()} ${orgBudget.currency}.`,
      };
    }

    return { warning: false };
  };

  const checkBudgetLimitForEdit = (projectId: string, budgetAmount: number, startDateStr: string, endDateStr: string) => {
    const start = startDateStr ? new Date(startDateStr) : new Date();
    const end = endDateStr ? new Date(endDateStr) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    const orgBudget = budgets.find(
      (b) =>
        b.scope === 'organization' &&
        b.status === 'active' &&
        new Date(b.startDate) <= start &&
        new Date(b.endDate) >= end
    );

    if (!orgBudget) {
      return {
        warning: true,
        message: 'There is no active organization budget covering this project period. Updating this project will bypass the check.',
      };
    }

    // Sum other project budgets in this period (excluding this project's budget)
    const existingProjectBudgets = budgets.filter(
      (b) =>
        b.scope === 'project' &&
        b.status === 'active' &&
        b.project !== projectId &&
        new Date(b.startDate) >= new Date(orgBudget.startDate) &&
        new Date(b.endDate) <= new Date(orgBudget.endDate)
    );

    const currentAllocated = existingProjectBudgets.reduce((sum, b) => sum + b.amount, 0);

    if (currentAllocated + budgetAmount > orgBudget.amount) {
      return {
        warning: true,
        message: `Project budget allocation exceeds organization budget ceiling. Available remaining: ${(orgBudget.amount - currentAllocated).toLocaleString()} ${orgBudget.currency}. Requested: ${budgetAmount.toLocaleString()} ${orgBudget.currency}.`,
      };
    }

    return { warning: false };
  };

  const handleEditSubmit = async (e: React.FormEvent, forceBypass = false) => {
    e.preventDefault();
    if (!selectedProject || !isAdmin) return;

    if (!forceBypass) {
      const check = checkBudgetLimitForEdit(
        selectedProject._id,
        Number(editForm.budget),
        editForm.startDate,
        editForm.endDate
      );
      if (check.warning) {
        setBudgetWarningMsg(check.message || '');
        setOnConfirmBudgetWarning(() => () => handleEditSubmit(e, true));
        setBudgetWarningOpen(true);
        return;
      }
    }

    setCreateSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await api.put(`/projects/${selectedProject._id}`, {
        name: editForm.name,
        code: editForm.code,
        client: editForm.client,
        budget: Number(editForm.budget),
        startDate: editForm.startDate ? new Date(editForm.startDate).toISOString() : undefined,
        endDate: editForm.endDate ? new Date(editForm.endDate).toISOString() : undefined,
        status: editForm.status,
        approvalFlow: editForm.approvalFlow || null,
        bypassBudgetLimit: forceBypass,
      });

      setSuccess('Project updated successfully');
      setEditModalOpen(false);
      loadProjects();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update project');
    } finally {
      setCreateSubmitting(false);
    }
  };

  // Members selection form
  const [selectedManagers, setSelectedManagers] = useState<string[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [membersSubmitting, setMembersSubmitting] = useState(false);

  const loadProjects = async () => {
    setLoading(true);
    setError('');
    try {
      // Admins see all projects; regular employees see only their assigned ones
      const endpoint = isAdmin ? '/projects' : '/projects/my';
      const [projectsResponse, budgetsResponse] = await Promise.all([
        api.get(endpoint),
        api.get('/budgets'),
      ]);
      setBudgets(budgetsResponse.data);
      const matchedData = projectsResponse.data.map((proj: any) => {
        const budgetDoc = budgetsResponse.data.find(
          (b: any) => b.scope === 'project' && b.project === proj._id && b.status === 'active'
        );
        return {
          ...proj,
          spent: proj.spent || (budgetDoc ? budgetDoc.spent : 0),
        };
      });
      setProjects(matchedData);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await api.get('/users?limit=100');
      setAllUsers(response.data.users);
    } catch (err) {
      console.error('Failed to load users list', err);
    }
  };

  const loadFilters = async () => {
    try {
      const [catRes, pmRes] = await Promise.all([
        api.get('/categories'),
        api.get('/payment-methods'),
      ]);
      setCategories(catRes.data.filter((c: any) => c.status === 'active'));
      setPaymentMethods(pmRes.data.filter((pm: any) => pm.status === 'active'));
    } catch (err) {
      console.error('Failed to load categories or payment methods', err);
    }
  };

  const loadWorkflows = async () => {
    try {
      const response = await api.get('/approvals/workflows');
      setWorkflows(response.data.filter((wf: any) => wf.status === 'active'));
    } catch (err) {
      console.error('Failed to load approval workflows', err);
    }
  };

  useEffect(() => {
    loadProjects();
    loadUsers();
    loadFilters();
    loadWorkflows();
  }, []);

  const openDirectExpenseModal = (project: ProjectItem) => {
    setSelectedProject(project);
    setDirectExpenseForm({
      employee: '',
      merchant: '',
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      category: '',
      paymentMethod: '',
      description: '',
    });
    setDirectExpenseModalOpen(true);
  };

  const handleDirectExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !isAdmin) return;

    setDirectExpenseSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        ...directExpenseForm,
        project: selectedProject._id,
        currency: selectedProject.currency, // Use project's currency
        status: 'approved', // Direct entries are pre-approved
      };

      await api.post('/expenses', payload);
      setSuccess(`Direct expense successfully logged and approved for project "${selectedProject.name}"!`);
      setDirectExpenseModalOpen(false);
      loadProjects();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to log direct project expense');
    } finally {
      setDirectExpenseSubmitting(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent, forceBypass = false) => {
    e.preventDefault();
    if (!isAdmin) return;

    if (!forceBypass) {
      const check = checkBudgetLimit(
        Number(createForm.budget),
        createForm.startDate,
        createForm.endDate
      );
      if (check.warning) {
        setBudgetWarningMsg(check.message || '');
        setOnConfirmBudgetWarning(() => () => handleCreateSubmit(e, true));
        setBudgetWarningOpen(true);
        return;
      }
    }

    setCreateSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post('/projects', {
        ...createForm,
        budget: Number(createForm.budget),
        startDate: createForm.startDate ? new Date(createForm.startDate).toISOString() : undefined,
        endDate: createForm.endDate ? new Date(createForm.endDate).toISOString() : undefined,
        approvalFlow: createForm.approvalFlow || undefined,
        bypassBudgetLimit: forceBypass,
      });

      setSuccess('Project created successfully');
      setProjects((prev) => [...prev, response.data]);
      setCreateModalOpen(false);
      setCreateForm({
        name: '',
        code: '',
        client: '',
        budget: 0,
        currency: orgCurrency || 'USD',
        startDate: '',
        endDate: '',
        status: 'active',
        approvalFlow: '',
      });
      loadProjects();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create project');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const openMembersModal = async (project: ProjectItem) => {
    setSelectedProject(project);
    try {
      // Fetch full details of the project to see populated members
      const response = await api.get(`/projects/${project._id}`);
      const fullProj = response.data;
      
      const mgrIds = fullProj.projectManagers.map((m: any) => m._id || m);
      const empIds = fullProj.employees.map((e: any) => e._id || e);
      
      setSelectedManagers(mgrIds);
      setSelectedEmployees(empIds);
      setMembersModalOpen(true);
    } catch (err) {
      console.error('Failed to load project members details', err);
    }
  };

  const handleMembersSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !selectedProject) return;

    setMembersSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await Promise.all([
        api.post(`/projects/${selectedProject._id}/managers`, { userIds: selectedManagers }),
        api.post(`/projects/${selectedProject._id}/members`, { userIds: selectedEmployees }),
      ]);
      setSuccess('Project members updated successfully');
      setMembersModalOpen(false);
      loadProjects();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update project members');
    } finally {
      setMembersSubmitting(false);
    }
  };

  const toggleManager = (id: string) => {
    setSelectedManagers((prev) =>
      prev.includes(id) ? prev.filter((mId) => mId !== id) : [...prev, id]
    );
  };

  const toggleEmployee = (id: string) => {
    setSelectedEmployees((prev) =>
      prev.includes(id) ? prev.filter((eId) => eId !== id) : [...prev, id]
    );
  };

  if (loading) {
    return (
      <div className="flex h-[75vh] items-center justify-center">
        <div className="flex flex-col items-center space-y-2 text-slate-400">
          <RefreshCw className="h-8 w-8 animate-spin text-cyan-400" />
          <span className="text-sm">Retrieving project portfolios context...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Title Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Project Directory</h1>
          <p className="text-sm text-slate-400">Manage client projects, allocate budgets, and assign employees.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={loadProjects}
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
              <FolderPlus className="mr-2 h-4 w-4" />
              New Project
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

      {/* Grid of Projects */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[300px] text-slate-400">
          <p className="text-sm">Loading project directory...</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center p-12 rounded-xl border border-white/5 bg-[#0b0f19]/30 text-slate-400 text-sm">
          No projects configured. Click New Project to register your first project.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div
              key={project._id}
              className="rounded-xl border border-white/5 bg-[#0b0f19]/60 backdrop-blur-md p-6 shadow-lg hover:border-white/10 transition-all duration-300 space-y-4"
            >
              {/* Card Header */}
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight">{project.name}</h3>
                  <p className="text-xs text-slate-500 font-mono tracking-wider uppercase">{project.code} • {project.client}</p>
                  {(() => {
                    const flowName = project.approvalFlow
                      ? (typeof project.approvalFlow === 'object'
                          ? (project.approvalFlow as any).name
                          : (workflows.find((w) => w._id === project.approvalFlow)?.name || 'Configured Flow'))
                      : 'Auto-Approve';
                    return (
                      <p className="text-[10px] text-cyan-400 mt-1.5 font-semibold bg-cyan-500/5 px-2 py-0.5 rounded border border-cyan-500/10 inline-block">
                        Flow: {flowName}
                      </p>
                    );
                  })()}
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase ${
                  project.status === 'active'
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                    : project.status === 'completed'
                    ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
                    : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                }`}>
                  {project.status}
                </span>
              </div>

              {/* Budget Section */}
              <div className="pt-2">
                <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
                  <span>Project Budget Allocation</span>
                  <span className="font-semibold text-slate-200">
                    {project.budget.toLocaleString(undefined, { style: 'currency', currency: project.currency })}
                  </span>
                </div>
                {(() => {
                  const spent = (project as any).spent || 0;
                  const budget = project.budget || 1;
                  const spentPct = Math.min(100, Math.round((spent / budget) * 100));
                  return (
                    <>
                      <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/5">
                        <div className="bg-cyan-500 h-full" style={{ width: `${spentPct}%` }} />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-semibold">
                        <span>Spent: {spent.toLocaleString(undefined, { style: 'currency', currency: project.currency })}</span>
                        <span>Remaining: {Math.max(0, budget - spent).toLocaleString(undefined, { style: 'currency', currency: project.currency })}</span>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Members Count & Timeline */}
              <div className="flex items-center justify-between pt-3 border-t border-white/5 text-xs text-slate-400">
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4 text-slate-500" />
                  <span>{project.employees.length} member(s)</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4 text-slate-500" />
                  <span>{project.startDate ? new Date(project.startDate).toLocaleDateString(undefined, { month: 'short', year: '2-digit' }) : 'N/A'}</span>
                </div>
              </div>

              {/* Actions */}
              {isAdmin && (
                <div className="pt-3 border-t border-white/5 flex gap-2 justify-end">
                  <button
                    onClick={() => openEditModal(project)}
                    className="flex items-center text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/10 transition-all duration-200"
                  >
                    <Edit className="mr-1 h-3.5 w-3.5" />
                    Edit
                  </button>
                  <button
                    onClick={() => openMembersModal(project)}
                    className="flex items-center text-xs font-semibold text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/5 px-2.5 py-1.5 rounded-lg border border-cyan-500/25 transition-all duration-200"
                  >
                    <Users className="mr-1 h-3.5 w-3.5" />
                    Assign Members
                  </button>
                  <button
                    onClick={() => openDirectExpenseModal(project)}
                    className="flex items-center text-xs font-semibold text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/5 px-2.5 py-1.5 rounded-lg border border-emerald-500/25 transition-all duration-200"
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Add Expense
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
              <h3 className="text-lg font-bold text-white">Create New Project</h3>
              <button onClick={() => setCreateModalOpen(false)} className="text-slate-500 hover:text-slate-300">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Project Name</label>
                  <input
                    type="text"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    placeholder="Acme Redesign"
                    className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Project Code</label>
                  <input
                    type="text"
                    value={createForm.code}
                    onChange={(e) => setCreateForm({ ...createForm, code: e.target.value })}
                    placeholder="ACME-RED"
                    className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none uppercase"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Client Name</label>
                  <input
                    type="text"
                    value={createForm.client}
                    onChange={(e) => setCreateForm({ ...createForm, client: e.target.value })}
                    placeholder="Acme Industries"
                    className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Approval Flow (Optional)</label>
                  <select
                    value={createForm.approvalFlow}
                    onChange={(e) => setCreateForm({ ...createForm, approvalFlow: e.target.value })}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-[#0c1020] px-4 py-2.5 text-sm text-white focus:border-cyan-500"
                  >
                    <option value="">No Approval Needed (Auto-Approve)</option>
                    {workflows.map((wf) => (
                      <option key={wf._id} value={wf._id}>
                        {wf.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Total Budget</label>
                  <input
                    type="number"
                    value={createForm.budget}
                    onChange={(e) => setCreateForm({ ...createForm, budget: Number(e.target.value) })}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Project Status</label>
                  <select
                    value={createForm.status}
                    onChange={(e) => setCreateForm({ ...createForm, status: e.target.value as any })}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-[#0c1020] px-4 py-2.5 text-sm text-white focus:border-cyan-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="completed">Completed</option>
                    <option value="on-hold">On-hold</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Start Date</label>
                  <input
                    type="date"
                    value={createForm.startDate}
                    onChange={(e) => setCreateForm({ ...createForm, startDate: e.target.value })}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-[#0c1020] px-4 py-2.5 text-sm text-white focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">End Date</label>
                  <input
                    type="date"
                    value={createForm.endDate}
                    onChange={(e) => setCreateForm({ ...createForm, endDate: e.target.value })}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-[#0c1020] px-4 py-2.5 text-sm text-white focus:border-cyan-500"
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
                  {createSubmitting ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Members Assignment Modal */}
      {membersModalOpen && selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMembersModalOpen(false)} />
          <div className="relative w-full max-w-2xl rounded-xl border border-white/5 bg-[#0b0f19] p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-white">Assign Project Members</h3>
                <p className="text-xs text-slate-500 font-mono uppercase">{selectedProject.name} ({selectedProject.code})</p>
              </div>
              <button onClick={() => setMembersModalOpen(false)} className="text-slate-500 hover:text-slate-300">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleMembersSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[350px] overflow-y-auto pr-2">
                {/* Managers Selection */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-cyan-400 border-b border-white/5 pb-1">Project Managers</h4>
                  <div className="space-y-2">
                    {allUsers.map((u) => {
                      const selected = selectedManagers.includes(u._id);
                      return (
                        <div
                          key={`mgr-${u._id}`}
                          onClick={() => toggleManager(u._id)}
                          className={`flex items-center justify-between p-2.5 rounded-lg border text-sm cursor-pointer transition-all ${
                            selected
                              ? 'bg-cyan-500/10 border-cyan-500/30 text-white'
                              : 'bg-white/5 border-transparent text-slate-400 hover:bg-white/10 hover:text-slate-200'
                          }`}
                        >
                          <div>
                            <p className="font-medium">{u.name}</p>
                            <p className="text-[10px] opacity-65">{u.email}</p>
                          </div>
                          {selected && <Check className="h-4 w-4 text-cyan-400" />}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Employees Selection */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-cyan-400 border-b border-white/5 pb-1">Assigned Employees</h4>
                  <div className="space-y-2">
                    {allUsers.map((u) => {
                      const selected = selectedEmployees.includes(u._id);
                      return (
                        <div
                          key={`emp-${u._id}`}
                          onClick={() => toggleEmployee(u._id)}
                          className={`flex items-center justify-between p-2.5 rounded-lg border text-sm cursor-pointer transition-all ${
                            selected
                              ? 'bg-cyan-500/10 border-cyan-500/30 text-white'
                              : 'bg-white/5 border-transparent text-slate-400 hover:bg-white/10 hover:text-slate-200'
                          }`}
                        >
                          <div>
                            <p className="font-medium">{u.name}</p>
                            <p className="text-[10px] opacity-65">{u.email}</p>
                          </div>
                          {selected && <Check className="h-4 w-4 text-cyan-400" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setMembersModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-white/10 hover:bg-white/5 text-slate-200 text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={membersSubmitting}
                  className="px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-semibold transition-colors text-sm"
                >
                  {membersSubmitting ? 'Saving...' : 'Save Assignments'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Direct Project Expense Modal */}
      {directExpenseModalOpen && selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDirectExpenseModalOpen(false)} />
          <div className="relative w-full max-w-lg rounded-xl border border-white/5 bg-[#0b0f19] p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-white">Add Project Expense</h3>
                <p className="text-xs text-slate-500 font-mono uppercase">Project: {selectedProject.name} ({selectedProject.code})</p>
              </div>
              <button onClick={() => setDirectExpenseModalOpen(false)} className="text-slate-500 hover:text-slate-300">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleDirectExpenseSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Employee *</label>
                <select
                  value={directExpenseForm.employee}
                  onChange={(e) => setDirectExpenseForm({ ...directExpenseForm, employee: e.target.value })}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-[#0c1020] px-4 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
                  required
                >
                  <option value="">Select Employee...</option>
                  {allUsers.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Merchant *</label>
                  <input
                    type="text"
                    value={directExpenseForm.merchant}
                    onChange={(e) => setDirectExpenseForm({ ...directExpenseForm, merchant: e.target.value })}
                    placeholder="AWS / Software Licence"
                    className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Date *</label>
                  <input
                    type="date"
                    value={directExpenseForm.date}
                    onChange={(e) => setDirectExpenseForm({ ...directExpenseForm, date: e.target.value })}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-[#0c1020] px-4 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
                    required
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Amount ({selectedProject.currency}) *</label>
                  <input
                    type="number"
                    value={directExpenseForm.amount || ''}
                    onChange={(e) => setDirectExpenseForm({ ...directExpenseForm, amount: Number(e.target.value) })}
                    placeholder="1500.00"
                    className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Category *</label>
                  <select
                    value={directExpenseForm.category}
                    onChange={(e) => setDirectExpenseForm({ ...directExpenseForm, category: e.target.value })}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-[#0c1020] px-4 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
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
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Payment Method *</label>
                  <select
                    value={directExpenseForm.paymentMethod}
                    onChange={(e) => setDirectExpenseForm({ ...directExpenseForm, paymentMethod: e.target.value })}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-[#0c1020] px-4 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
                    required
                  >
                    <option value="">Select Method...</option>
                    {paymentMethods.map((pm) => (
                      <option key={pm._id} value={pm._id}>
                        {pm.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Description (Optional)</label>
                <textarea
                  value={directExpenseForm.description}
                  onChange={(e) => setDirectExpenseForm({ ...directExpenseForm, description: e.target.value })}
                  placeholder="Additional context about this project expenditure..."
                  className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setDirectExpenseModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-white/10 hover:bg-white/5 text-slate-200 text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={directExpenseSubmitting}
                  className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold transition-colors text-sm"
                >
                  {directExpenseSubmitting ? 'Logging...' : 'Log & Approve Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditModalOpen(false)} />
          <div className="relative w-full max-w-lg rounded-xl border border-white/5 bg-[#0b0f19] p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-white">Edit Project</h3>
              <button onClick={() => setEditModalOpen(false)} className="text-slate-500 hover:text-slate-300">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Project Name</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    placeholder="Acme Redesign"
                    className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Project Code</label>
                  <input
                    type="text"
                    value={editForm.code}
                    onChange={(e) => setEditForm({ ...editForm, code: e.target.value })}
                    placeholder="ACME-RED"
                    className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none uppercase"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Client Name</label>
                  <input
                    type="text"
                    value={editForm.client}
                    onChange={(e) => setEditForm({ ...editForm, client: e.target.value })}
                    placeholder="Acme Industries"
                    className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Total Budget</label>
                  <input
                    type="number"
                    value={editForm.budget}
                    onChange={(e) => setEditForm({ ...editForm, budget: Number(e.target.value) })}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Project Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-[#0c1020] px-4 py-2.5 text-sm text-white focus:border-cyan-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="completed">Completed</option>
                    <option value="on-hold">On-hold</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Start Date</label>
                  <input
                    type="date"
                    value={editForm.startDate}
                    onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-[#0c1020] px-4 py-2.5 text-sm text-white focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">End Date</label>
                  <input
                    type="date"
                    value={editForm.endDate}
                    onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-[#0c1020] px-4 py-2.5 text-sm text-white focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Approval Flow (Optional)</label>
                  <select
                    value={editForm.approvalFlow}
                    onChange={(e) => setEditForm({ ...editForm, approvalFlow: e.target.value })}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-[#0c1020] px-4 py-2.5 text-sm text-white focus:border-cyan-500"
                  >
                    <option value="">No Approval Needed (Auto-Approve)</option>
                    {workflows.map((wf) => (
                      <option key={wf._id} value={wf._id}>
                        {wf.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-white/10 hover:bg-white/5 text-slate-200 text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-semibold transition-colors text-sm"
                >
                  {createSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Budget Warning Confirmation Modal */}
      {budgetWarningOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setBudgetWarningOpen(false)} />
          <div className="relative w-full max-w-md rounded-xl border border-amber-500/20 bg-[#0b0f19] p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 text-amber-400">
              <AlertTriangle className="h-6 w-6 shrink-0" />
              <h3 className="text-lg font-bold text-white font-sans">Budget Limit Warning</h3>
            </div>
            
            <p className="text-sm text-slate-300 leading-relaxed font-sans">
              {budgetWarningMsg}
            </p>
            
            <p className="text-xs text-slate-500 font-sans">
              Creating or updating this project will exceed the designated organization caps. Do you approve and wish to proceed anyway?
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setBudgetWarningOpen(false)}
                className="px-4 py-2 rounded-lg border border-white/10 hover:bg-white/5 text-slate-200 text-sm font-semibold transition-colors font-sans"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setBudgetWarningOpen(false);
                  if (onConfirmBudgetWarning) onConfirmBudgetWarning();
                }}
                className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold transition-colors text-sm font-sans"
              >
                Proceed anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
