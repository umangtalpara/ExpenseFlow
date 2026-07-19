'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { Search, UserPlus, SlidersHorizontal, ChevronLeft, ChevronRight, Edit3, Trash2, Check, X, ShieldAlert, RefreshCw } from 'lucide-react';

interface UserItem {
  _id: string;
  name: string;
  email: string;
  mobile?: string;
  employeeId?: string;
  department?: string;
  designation?: string;
  joiningDate?: string;
  status: 'active' | 'inactive' | 'disabled';
  role: { _id: string; name: string } | string;
  manager?: { _id: string; name: string; email: string } | null;
}

interface DropdownItem {
  _id: string;
  name: string;
  code: string;
}

export default function EmployeeDirectoryPage() {
  const { user: currentUser } = useAuthStore();
  const isAdmin = currentUser?.role === 'Administrator' || currentUser?.role === 'Organization Admin' || currentUser?.role?.includes('Admin');

  const [employees, setEmployees] = useState<UserItem[]>([]);
  const [departments, setDepartments] = useState<DropdownItem[]>([]);
  const [designations, setDesignations] = useState<DropdownItem[]>([]);
  const [allUsers, setAllUsers] = useState<{ _id: string; name: string }[]>([]); // for manager dropdown
  const [roles, setRoles] = useState<{ _id: string; name: string }[]>([]); // for role dropdown

  // Table State
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filters State
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedDesig, setSelectedDesig] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Modals State
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<UserItem | null>(null);

  // Invite Form State
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRoleId, setInviteRoleId] = useState('');
  const [generatedInviteLink, setGeneratedInviteLink] = useState('');
  const [inviteSubmitting, setInviteSubmitting] = useState(false);

  // Edit Form State
  const [editForm, setEditForm] = useState({
    name: '',
    mobile: '',
    employeeId: '',
    department: '',
    designation: '',
    joiningDate: '',
    manager: '',
    role: '',
  });
  const [editSubmitting, setEditSubmitting] = useState(false);

  const fetchEmployees = async () => {
    setLoading(true);
    setError('');
    try {
      const params: any = {
        page,
        limit,
      };
      if (search) params.search = search;
      if (selectedDept) params.department = selectedDept;
      if (selectedDesig) params.designation = selectedDesig;
      if (selectedStatus) params.status = selectedStatus;

      const response = await api.get('/users', { params });
      setEmployees(response.data.users);
      setTotal(response.data.total);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load employee directory');
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const [deptsResp, desigsResp, usersResp, rolesResp] = await Promise.all([
        api.get('/departments'),
        api.get('/designations'),
        api.get('/users?limit=100'),
        api.get('/roles'),
      ]);
      setDepartments(deptsResp.data);
      setDesignations(desigsResp.data);
      setAllUsers(usersResp.data.users.map((u: any) => ({ _id: u._id, name: u.name })));
      setRoles(rolesResp.data);
    } catch (err) {
      console.error('Failed to load filter metadata', err);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [page, selectedDept, selectedDesig, selectedStatus]);

  useEffect(() => {
    fetchMetadata();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchEmployees();
  };

  // Toggle Employee status
  const handleToggleStatus = async (emp: UserItem) => {
    if (!isAdmin) return;
    setError('');
    setSuccess('');
    const newStatus = emp.status === 'active' ? 'disabled' : 'active';
    try {
      await api.patch(`/users/${emp._id}/status`, { status: newStatus });
      setEmployees((prev) =>
        prev.map((e) => (e._id === emp._id ? { ...e, status: newStatus } : e))
      );
      setSuccess(`User status updated to ${newStatus}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to toggle employee status');
    }
  };

  // Delete Employee
  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    if (!confirm('Are you sure you want to remove this employee from the directory?')) return;
    setError('');
    setSuccess('');
    try {
      await api.delete(`/users/${id}`);
      setEmployees((prev) => prev.filter((e) => e._id !== id));
      setSuccess('Employee removed successfully');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to remove employee');
    }
  };

  // Open Edit Modal
  const openEditModal = (emp: UserItem) => {
    setSelectedEmployee(emp);
    const roleId = typeof emp.role === 'object' && emp.role !== null ? emp.role._id : (emp.role || '');
    setEditForm({
      name: emp.name || '',
      mobile: emp.mobile || '',
      employeeId: emp.employeeId || '',
      department: emp.department || '',
      designation: emp.designation || '',
      joiningDate: emp.joiningDate ? emp.joiningDate.split('T')[0] : '',
      manager: emp.manager ? emp.manager._id : '',
      role: roleId,
    });
    setEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !selectedEmployee) return;

    setEditSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.patch(`/users/${selectedEmployee._id}`, {
        name: editForm.name,
        mobile: editForm.mobile,
        employeeId: editForm.employeeId,
        department: editForm.department,
        designation: editForm.designation,
        joiningDate: editForm.joiningDate ? new Date(editForm.joiningDate).toISOString() : undefined,
        manager: editForm.manager || null,
        role: editForm.role || undefined,
      });

      setSuccess('Employee profile updated successfully');
      setEditModalOpen(false);
      fetchEmployees();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update employee profile');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    setInviteSubmitting(true);
    setError('');
    setGeneratedInviteLink('');

    try {
      const response = await api.post('/invitations', {
        email: inviteEmail,
        roleId: inviteRoleId,
      });
      // Mock generated email link
      const tokenLink = `${window.location.origin}/accept-invite?token=${response.data.token}`;
      setGeneratedInviteLink(tokenLink);
      setSuccess('Invitation token generated successfully!');
      setInviteEmail('');
      setInviteRoleId('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to generate invitation link');
    } finally {
      setInviteSubmitting(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  if (loading) {
    return (
      <div className="flex h-[75vh] items-center justify-center">
        <div className="flex flex-col items-center space-y-2 text-slate-400">
          <RefreshCw className="h-8 w-8 animate-spin text-cyan-400" />
          <span className="text-sm">Retrieving employee records directory...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Employee Directory</h1>
          <p className="text-sm text-slate-400">View and manage employee profile parameters, roles, and status codes.</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => {
              setInviteModalOpen(true);
              setGeneratedInviteLink('');
              setInviteEmail('');
              setInviteRoleId('');
            }}
            className="flex items-center px-4 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-semibold transition-all duration-200 shadow-lg shadow-cyan-500/25 text-sm"
          >
            <UserPlus className="mr-2 h-4.5 w-4.5" />
            Invite Employee
          </button>
        )}
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

      {/* Filter and Search Bar */}
      <div className="rounded-xl border border-white/5 bg-[#0b0f19]/60 backdrop-blur-md p-4 space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              placeholder="Search by name, email, or employee ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-sm font-semibold transition-colors"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-white/5">
          <div className="flex items-center text-xs font-semibold text-slate-500 uppercase tracking-wider gap-2">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filters
          </div>

          {/* Department Filter */}
          <select
            value={selectedDept}
            onChange={(e) => {
              setSelectedDept(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-white/10 bg-[#0c1020] px-3 py-1.5 text-xs text-slate-300 focus:border-cyan-500 focus:outline-none"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d._id} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>

          {/* Designation Filter */}
          <select
            value={selectedDesig}
            onChange={(e) => {
              setSelectedDesig(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-white/10 bg-[#0c1020] px-3 py-1.5 text-xs text-slate-300 focus:border-cyan-500 focus:outline-none"
          >
            <option value="">All Designations</option>
            {designations.map((d) => (
              <option key={d._id} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-white/10 bg-[#0c1020] px-3 py-1.5 text-xs text-slate-300 focus:border-cyan-500 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>
      </div>

      {/* Directory Table */}
      <div className="rounded-xl border border-white/5 bg-[#0b0f19]/60 backdrop-blur-md overflow-hidden shadow-lg">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            Loading employees...
          </div>
        ) : employees.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            No employees found matching selected search or filter values.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/5">
              <thead className="bg-[#0c1020]">
                <tr>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Employee Details</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Job Sector</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Manager</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Status</th>
                  {isAdmin && (
                    <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 bg-transparent">
                {employees.map((emp) => (
                  <tr key={emp._id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-9 w-9 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold">
                          {emp.name ? emp.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-white">{emp.name}</p>
                          <p className="text-xs text-slate-400">{emp.email}</p>
                          {emp.employeeId && (
                            <span className="text-[10px] text-cyan-500 font-mono tracking-wider">
                              ID: {emp.employeeId}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm text-slate-200">{emp.designation || 'Not Assigned'}</p>
                      <p className="text-xs text-slate-500">{emp.department || 'No Department'}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                      {emp.manager ? (
                        <div>
                          <p className="text-slate-200">{emp.manager.name}</p>
                          <p className="text-xs text-slate-500">{emp.manager.email}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-600">None Assigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleStatus(emp)}
                        disabled={!isAdmin}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wider uppercase transition-colors select-none ${
                          emp.status === 'active'
                            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                            : 'bg-red-500/10 border border-red-500/20 text-red-400'
                        } ${isAdmin ? 'hover:bg-opacity-20 cursor-pointer' : 'cursor-default'}`}
                      >
                        {emp.status}
                      </button>
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openEditModal(emp)}
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
                            title="Edit Profile"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(emp._id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 bg-[#0c1020] border-t border-white/5">
            <span className="text-xs text-slate-500">
              Showing page {page} of {totalPages} ({total} employees)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg border border-white/10 bg-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg border border-white/10 bg-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setInviteModalOpen(false)} />
          <div className="relative w-full max-w-md rounded-xl border border-white/5 bg-[#0b0f19] p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-white">Invite New Employee</h3>
              <button onClick={() => setInviteModalOpen(false)} className="text-slate-500 hover:text-slate-300">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Email Address</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  disabled={inviteSubmitting}
                  placeholder="employee@company.com"
                  className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Onboarding Role</label>
                <select
                  value={inviteRoleId}
                  onChange={(e) => setInviteRoleId(e.target.value)}
                  disabled={inviteSubmitting}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-[#0c1020] px-4 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
                  required
                >
                  <option value="">Select a role...</option>
                  {roles.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={inviteSubmitting}
                className="w-full flex items-center justify-center px-4 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-semibold transition-colors text-sm disabled:opacity-50"
              >
                {inviteSubmitting && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                {inviteSubmitting ? 'Generating...' : 'Generate Onboarding Token'}
              </button>
            </form>

            {generatedInviteLink && (
              <div className="pt-4 border-t border-white/5 space-y-2">
                <p className="text-xs font-semibold text-slate-400">Copy the claiming onboarding link below:</p>
                <div className="rounded-lg bg-cyan-500/5 border border-cyan-500/20 p-3 text-cyan-400 text-xs font-mono break-all select-all select-text">
                  {generatedInviteLink}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditModalOpen(false)} />
          <div className="relative w-full max-w-lg rounded-xl border border-white/5 bg-[#0b0f19] p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-white">Edit Employee Profile</h3>
              <button onClick={() => setEditModalOpen(false)} className="text-slate-500 hover:text-slate-300">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Name</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    disabled={editSubmitting}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Mobile</label>
                  <input
                    type="text"
                    value={editForm.mobile}
                    onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })}
                    disabled={editSubmitting}
                    placeholder="+1 555 1234"
                    className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Employee ID</label>
                  <input
                    type="text"
                    value={editForm.employeeId}
                    onChange={(e) => setEditForm({ ...editForm, employeeId: e.target.value })}
                    disabled={editSubmitting}
                    placeholder="EMP-001"
                    className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Joining Date</label>
                  <input
                    type="date"
                    value={editForm.joiningDate}
                    onChange={(e) => setEditForm({ ...editForm, joiningDate: e.target.value })}
                    disabled={editSubmitting}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-[#0c1020] px-4 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Department</label>
                  <select
                    value={editForm.department}
                    onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                    disabled={editSubmitting}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-[#0c1020] px-4 py-2.5 text-sm text-white focus:border-cyan-500"
                  >
                    <option value="">Select Department...</option>
                    {departments.map((d) => (
                      <option key={d._id} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Designation</label>
                  <select
                    value={editForm.designation}
                    onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })}
                    disabled={editSubmitting}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-[#0c1020] px-4 py-2.5 text-sm text-white focus:border-cyan-500"
                  >
                    <option value="">Select Designation...</option>
                    {designations.map((d) => (
                      <option key={d._id} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Reports To (Manager)</label>
                  <select
                    value={editForm.manager}
                    onChange={(e) => setEditForm({ ...editForm, manager: e.target.value })}
                    disabled={editSubmitting}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-[#0c1020] px-4 py-2.5 text-sm text-white focus:border-cyan-500"
                  >
                    <option value="">Select Manager...</option>
                    {allUsers
                      .filter((u) => u._id !== selectedEmployee?._id)
                      .map((u) => (
                        <option key={u._id} value={u._id}>
                          {u.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Security Role</label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                    disabled={editSubmitting}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-[#0c1020] px-4 py-2.5 text-sm text-white focus:border-cyan-500"
                  >
                    {roles.map((r) => (
                      <option key={r._id} value={r._id}>
                        {r.name}
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
                  disabled={editSubmitting}
                  className="flex items-center justify-center px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-semibold transition-colors text-sm disabled:opacity-50"
                >
                  {editSubmitting && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                  {editSubmitting ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
