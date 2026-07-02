'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { FolderPlus, Users, Calendar, DollarSign, RefreshCw, X, ShieldAlert, Check } from 'lucide-react';

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
}

export default function ProjectsPage() {
  const { user: currentUser } = useAuthStore();
  const isAdmin = currentUser?.role === 'Administrator' || currentUser?.role === 'Organization Admin' || currentUser?.role?.includes('Admin');

  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [allUsers, setAllUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [membersModalOpen, setMembersModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectItem | null>(null);

  // Forms
  const [createForm, setCreateForm] = useState({
    name: '',
    code: '',
    client: '',
    budget: 0,
    currency: 'USD',
    startDate: '',
    endDate: '',
    status: 'active',
  });
  const [createSubmitting, setCreateSubmitting] = useState(false);

  // Members selection form
  const [selectedManagers, setSelectedManagers] = useState<string[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [membersSubmitting, setMembersSubmitting] = useState(false);

  const loadProjects = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/projects');
      setProjects(response.data);
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

  useEffect(() => {
    loadProjects();
    loadUsers();
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    setCreateSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post('/projects', {
        ...createForm,
        budget: Number(createForm.budget),
        startDate: createForm.startDate ? new Date(createForm.startDate).toISOString() : undefined,
        endDate: createForm.endDate ? new Date(createForm.endDate).toISOString() : undefined,
      });

      setSuccess('Project created successfully');
      setProjects((prev) => [...prev, response.data]);
      setCreateModalOpen(false);
      setCreateForm({
        name: '',
        code: '',
        client: '',
        budget: 0,
        currency: 'USD',
        startDate: '',
        endDate: '',
        status: 'active',
      });
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
                {/* Budget Health Bar (0% spent placeholder) */}
                <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/5">
                  <div className="bg-cyan-500 h-full w-[0%]" />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                  <span>0% Spent</span>
                  <span>100% Remaining</span>
                </div>
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
                <div className="pt-3 border-t border-white/5 flex justify-end">
                  <button
                    onClick={() => openMembersModal(project)}
                    className="flex items-center text-xs font-semibold text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/5 px-3 py-1.5 rounded-lg border border-cyan-500/25 transition-all duration-200"
                  >
                    <Users className="mr-1.5 h-3.5 w-3.5" />
                    Assign Members
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
    </div>
  );
}
