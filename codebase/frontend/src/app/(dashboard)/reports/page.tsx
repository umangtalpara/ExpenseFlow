'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useOrgStore } from '@/store/org.store';
import {
  BarChart3,
  Download,
  Search,
  RefreshCw,
  Calendar,
  Layers,
  ChevronLeft,
  ChevronRight,
  Filter,
  DollarSign,
  User,
  CreditCard,
  Briefcase,
  AlertCircle,
} from 'lucide-react';

interface ExpenseItem {
  _id: string;
  title: string;
  merchant: string;
  amount: number;
  currency: string;
  convertedAmount: number;
  date: string;
  status: string;
  employee?: {
    name: string;
    email: string;
  };
  project?: {
    name: string;
    code: string;
  };
  category?: {
    name: string;
  };
  paymentMethod?: {
    name: string;
  };
}

export default function ReportsPage() {
  const { user } = useAuthStore();
  const { currency: orgCurrency } = useOrgStore();
  const isAdmin = user?.role === 'Organization Admin' || user?.role?.includes('Admin');
  const isPM = user?.role === 'Project Manager';

  // Filters state
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterProjectId, setFilterProjectId] = useState('');
  const [filterEmployeeId, setFilterEmployeeId] = useState('');
  const [filterVendorId, setFilterVendorId] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterMinAmount, setFilterMinAmount] = useState('');
  const [filterMaxAmount, setFilterMaxAmount] = useState('');

  // Dropdown list options
  const [projects, setProjects] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);

  // Report results state
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);

  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  // Fetch dropdown collections
  const loadFilterOptions = async () => {
    try {
      const [projRes, empRes, vendRes, catRes, pmRes] = await Promise.all([
        api.get('/projects'),
        api.get('/users?limit=100'),
        api.get('/vendors'),
        api.get('/categories'),
        api.get('/payment-methods'),
      ]);

      setProjects(projRes.data || []);
      setEmployees(empRes.data.users || empRes.data.data || empRes.data || []);
      setVendors(vendRes.data || []);
      setCategories(catRes.data || []);
      setPaymentMethods(pmRes.data || []);
    } catch (err) {
      console.error('Failed to load filters dropdown lists', err);
    }
  };

  // Build query string
  const buildQueryString = () => {
    let query = `page=${page}&limit=${limit}`;
    if (filterStartDate) query += `&startDate=${filterStartDate}`;
    if (filterEndDate) query += `&endDate=${filterEndDate}`;
    if (filterProjectId) query += `&projectId=${filterProjectId}`;
    if (filterEmployeeId) query += `&employeeId=${filterEmployeeId}`;
    if (filterVendorId) query += `&vendorId=${filterVendorId}`;
    if (filterCategory) query += `&category=${filterCategory}`;
    if (filterPaymentMethod) query += `&paymentMethod=${filterPaymentMethod}`;
    if (filterStatus) query += `&status=${filterStatus}`;
    if (filterMinAmount) query += `&minAmount=${filterMinAmount}`;
    if (filterMaxAmount) query += `&maxAmount=${filterMaxAmount}`;
    return query;
  };

  const loadReportData = async () => {
    setLoading(true);
    setError('');
    try {
      const qs = buildQueryString();
      const response = await api.get(`/reports/data?${qs}`);
      setExpenses(response.data.data);
      setTotal(response.data.total);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch financial report data');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = async () => {
    setExporting(true);
    setError('');
    try {
      const qs = buildQueryString();
      const response = await api.get(`/reports/export?${qs}`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'text/csv' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `expense-report-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err: any) {
      setError('Export failed: Unable to stream file. Verify authentication.');
    } finally {
      setExporting(false);
    }
  };

  const handleResetFilters = () => {
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterProjectId('');
    setFilterEmployeeId('');
    setFilterVendorId('');
    setFilterCategory('');
    setFilterPaymentMethod('');
    setFilterStatus('');
    setFilterMinAmount('');
    setFilterMaxAmount('');
    setPage(1);
  };

  useEffect(() => {
    if (isAdmin || isPM) {
      loadFilterOptions();
    }
  }, []);

  useEffect(() => {
    if (isAdmin || isPM) {
      loadReportData();
    } else {
      setLoading(false);
      setError('Access Denied: You do not have permissions to view reports');
    }
  }, [page, filterProjectId, filterEmployeeId, filterVendorId, filterCategory, filterPaymentMethod, filterStatus]);

  // Handle manual trigger for inputs that require clicking search (like date range and amount ranges)
  const handleApplyTextFilters = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadReportData();
  };

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'approved') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (s === 'reimbursed') return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
    if (s === 'submitted') return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
    if (s === 'rejected') return 'bg-red-500/10 text-red-400 border-red-500/20';
    return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
  };

  if (!isAdmin && !isPM) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] space-y-4">
        <AlertCircle className="h-16 w-16 text-red-500 animate-pulse" />
        <h2 className="text-xl font-bold text-white">Access Denied</h2>
        <p className="text-slate-400 text-sm max-w-md text-center">
          Only Organization Admins and Project Managers have permission to query financial statements.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Title Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Financial Reports Engine</h1>
          <p className="text-sm text-slate-400">Generate structured expense report sheets, inspect costs, and export to CSV/Excel.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleResetFilters}
            className="px-4 py-2.5 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-slate-300 font-semibold text-xs transition-colors"
          >
            Clear Filters
          </button>
          <button
            onClick={handleExportCsv}
            disabled={exporting || expenses.length === 0}
            className="flex items-center px-4 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-semibold transition-all duration-200 shadow-lg shadow-cyan-500/25 text-xs disabled:opacity-50"
          >
            {exporting ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Export CSV (Excel)
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Advanced Filters Panel */}
      <form onSubmit={handleApplyTextFilters} className="bg-[#0b0f19]/40 border border-white/5 rounded-2xl p-6 space-y-6 shadow-xl">
        <h3 className="text-sm font-semibold text-slate-300 flex items-center border-b border-white/5 pb-3">
          <Filter className="mr-2 h-4 w-4 text-cyan-400" />
          Filter Specifications
        </h3>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {/* Project */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Project</label>
            <select
              value={filterProjectId}
              onChange={(e) => setFilterProjectId(e.target.value)}
              className="w-full bg-[#0d1222] border border-white/10 rounded-lg p-2.5 text-xs text-slate-300 focus:border-cyan-500 focus:outline-none"
            >
              <option value="">All Projects</option>
              {projects.map((p) => (
                <option key={p._id} value={p._id}>[{p.code}] {p.name}</option>
              ))}
            </select>
          </div>

          {/* Employee */}
          {isAdmin && (
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Employee</label>
              <select
                value={filterEmployeeId}
                onChange={(e) => setFilterEmployeeId(e.target.value)}
                className="w-full bg-[#0d1222] border border-white/10 rounded-lg p-2.5 text-xs text-slate-300 focus:border-cyan-500 focus:outline-none"
              >
                <option value="">All Employees</option>
                {employees.map((e) => (
                  <option key={e._id} value={e._id}>{e.name} ({e.email})</option>
                ))}
              </select>
            </div>
          )}

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Category</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full bg-[#0d1222] border border-white/10 rounded-lg p-2.5 text-xs text-slate-300 focus:border-cyan-500 focus:outline-none"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Payment Method</label>
            <select
              value={filterPaymentMethod}
              onChange={(e) => setFilterPaymentMethod(e.target.value)}
              className="w-full bg-[#0d1222] border border-white/10 rounded-lg p-2.5 text-xs text-slate-300 focus:border-cyan-500 focus:outline-none"
            >
              <option value="">All Payment Methods</option>
              {paymentMethods.map((pm) => (
                <option key={pm._id} value={pm._id}>{pm.name}</option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Claim Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full bg-[#0d1222] border border-white/10 rounded-lg p-2.5 text-xs text-slate-300 focus:border-cyan-500 focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="submitted">Pending Approval</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="reimbursed">Reimbursed (Paid)</option>
              <option value="draft">Draft</option>
            </select>
          </div>

          {/* Date Range Start */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Start Date</label>
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="w-full bg-[#0d1222] border border-white/10 rounded-lg p-2.5 text-xs text-slate-300 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          {/* Date Range End */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">End Date</label>
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="w-full bg-[#0d1222] border border-white/10 rounded-lg p-2.5 text-xs text-slate-300 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          {/* Amount Range Min */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Min Amount ($)</label>
            <input
              type="number"
              placeholder="e.g. 50"
              value={filterMinAmount}
              onChange={(e) => setFilterMinAmount(e.target.value)}
              className="w-full bg-[#0d1222] border border-white/10 rounded-lg p-2.5 text-xs text-slate-300 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          {/* Amount Range Max */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Max Amount ($)</label>
            <input
              type="number"
              placeholder="e.g. 1000"
              value={filterMaxAmount}
              onChange={(e) => setFilterMaxAmount(e.target.value)}
              className="w-full bg-[#0d1222] border border-white/10 rounded-lg p-2.5 text-xs text-slate-300 focus:border-cyan-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
          <button
            type="submit"
            className="flex items-center px-5 py-2.5 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 text-slate-300 hover:text-white font-semibold text-xs transition-colors"
          >
            <Search className="mr-2 h-4.5 w-4.5 text-cyan-400" />
            Apply Filters
          </button>
        </div>
      </form>

      {/* Results grid */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="flex flex-col items-center space-y-2 text-slate-400">
            <RefreshCw className="h-8 w-8 animate-spin text-cyan-400" />
            <span className="text-sm">Generating Cost Statements...</span>
          </div>
        </div>
      ) : expenses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 p-12 text-center bg-[#070b14]/50">
          <BarChart3 className="mx-auto h-12 w-12 text-slate-600 mb-4" />
          <h3 className="text-base font-semibold text-slate-300">No report records matched</h3>
          <p className="mt-1 text-sm text-slate-500">Modify your filter specifications to query active expense claims.</p>
        </div>
      ) : (
        <div className="bg-[#0b0f19]/40 border border-white/5 rounded-xl overflow-hidden shadow-xl space-y-2">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/5 text-left text-sm text-slate-300">
              <thead className="bg-[#0c1020] text-xs font-semibold tracking-wider text-slate-400 uppercase">
                <tr>
                  <th className="px-6 py-4">Title / Merchant</th>
                  <th className="px-6 py-4">Submitted By</th>
                  <th className="px-6 py-4">Project Context</th>
                  <th className="px-6 py-4">Category / PM</th>
                  <th className="px-6 py-4">Claim Date</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 bg-[#0b0f19]/20">
                {expenses.map((exp) => (
                  <tr key={exp._id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-white truncate max-w-[180px]">{exp.title}</p>
                        <p className="text-xs text-slate-500 truncate max-w-[180px]">Merchant: {exp.merchant}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-slate-300 flex items-center">
                          <User className="mr-1 h-3.5 w-3.5 text-cyan-400/80" />
                          {exp.employee?.name || 'Unknown'}
                        </p>
                        <p className="text-[10px] text-slate-500">{exp.employee?.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {exp.project ? (
                        <div>
                          <p className="font-medium text-slate-300 flex items-center">
                            <Briefcase className="mr-1 h-3.5 w-3.5 text-purple-400/80" />
                            {exp.project.name}
                          </p>
                          <p className="text-[10px] text-slate-500">Code: {exp.project.code}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500 italic">Organization Wide</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-slate-300 flex items-center">
                          <Layers className="mr-1 h-3.5 w-3.5 text-yellow-400/80" />
                          {exp.category?.name || 'Uncategorized'}
                        </p>
                        <p className="text-[10px] text-slate-500 flex items-center mt-0.5">
                          <CreditCard className="mr-1 h-3 w-3" />
                          {exp.paymentMethod?.name || 'Cash'}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {new Date(exp.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border uppercase ${getStatusBadge(exp.status)}`}>
                        {exp.status === 'submitted' ? 'pending' : exp.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div>
                        <p className="font-bold text-white text-base">
                          {exp.amount.toLocaleString()} {exp.currency}
                        </p>
                        {exp.currency !== orgCurrency && (
                          <p className="text-[10px] text-slate-500">
                            ~ {exp.convertedAmount.toLocaleString()} {orgCurrency}
                          </p>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex justify-between items-center bg-[#0b0f19]/40 border-t border-white/5 px-6 py-4">
            <span className="text-xs text-slate-500">
              Showing {expenses.length} of {total} cost claims
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                disabled={page * limit >= total}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
