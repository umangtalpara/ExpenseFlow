'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { History, ShieldAlert, Search, RefreshCw, Calendar, User as UserIcon, Terminal, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';

interface AuditLogItem {
  _id: string;
  action: string;
  entityType?: string;
  entityId?: string;
  timestamp: string;
  user?: {
    name: string;
    email: string;
  };
  details?: any;
}

interface UserOption {
  _id: string;
  name: string;
  email: string;
}

export default function AuditLogsPage() {
  const { user: currentUser } = useAuthStore();
  const isAdmin = currentUser?.role === 'Organization Admin' || currentUser?.role?.includes('Admin');

  // Logs state
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(25);

  // Filters state
  const [filterAction, setFilterAction] = useState('');
  const [filterEntityType, setFilterEntityType] = useState('');
  const [filterUserId, setFilterUserId] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Collapsible detail logs
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const loadUsers = async () => {
    try {
      const response = await api.get('/users?limit=100');
      // If endpoint returns { data, total }, use data, else use response.data directly
      const usersList = response.data.data || response.data || [];
      setUsers(usersList);
    } catch (err) {
      console.error('Failed to load users list for filter selection', err);
    }
  };

  const loadLogs = async () => {
    setLoading(true);
    setError('');
    try {
      let url = `/audit-logs?page=${page}&limit=${limit}`;
      if (filterAction) url += `&action=${filterAction}`;
      if (filterEntityType) url += `&entityType=${filterEntityType}`;
      if (filterUserId) url += `&userId=${filterUserId}`;
      if (filterStartDate) url += `&startDate=${filterStartDate}`;
      if (filterEndDate) url += `&endDate=${filterEndDate}`;

      const response = await api.get(url);
      setLogs(response.data.data);
      setTotal(response.data.total);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load audit logs. Verify permissions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadLogs();
    } else {
      setLoading(false);
      setError('Access Denied: You do not have permission to view audit logs');
    }
  }, [page, filterAction, filterEntityType, filterUserId, filterStartDate, filterEndDate]);

  const getActionBadgeClass = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('CREATE') || act.includes('SIGNUP') || act.includes('GENERATED')) {
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    }
    if (act.includes('UPDATE') || act.includes('EDIT')) {
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    }
    if (act.includes('DELETE') || act.includes('REJECT')) {
      return 'bg-red-500/10 text-red-400 border-red-500/20';
    }
    if (act.includes('LOGIN')) {
      return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    }
    if (act.includes('LOGOUT')) {
      return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
    if (act.includes('PAID')) {
      return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
    }
    return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
  };

  const toggleExpandLog = (id: string) => {
    setExpandedLogId(expandedLogId === id ? null : id);
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] space-y-4">
        <ShieldAlert className="h-16 w-16 text-red-500 animate-pulse" />
        <h2 className="text-xl font-bold text-white">Access Denied</h2>
        <p className="text-slate-400 text-sm max-w-md text-center">
          Only Organization Administrators have permission to view the audit logs trail.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Title Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">System Audit Trails</h1>
          <p className="text-sm text-slate-400">Track logins, logouts, budget allocation revisions, and database operations.</p>
        </div>
        <button
          onClick={loadLogs}
          className="p-2 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-all duration-200"
          title="Refresh logs"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Advanced Filters Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 bg-[#0b0f19]/40 border border-white/5 rounded-xl p-4">
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Actor (User)</label>
          <select
            value={filterUserId}
            onChange={(e) => { setFilterUserId(e.target.value); setPage(1); }}
            className="w-full bg-[#0d1222] border border-white/10 rounded-lg p-2 text-sm text-slate-300 focus:border-cyan-500 focus:outline-none"
          >
            <option value="">All Actors</option>
            {users.map((u) => (
              <option key={u._id} value={u._id}>{u.name} ({u.email})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Action Type</label>
          <select
            value={filterAction}
            onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
            className="w-full bg-[#0d1222] border border-white/10 rounded-lg p-2 text-sm text-slate-300 focus:border-cyan-500 focus:outline-none"
          >
            <option value="">All Actions</option>
            <option value="LOGIN">LOGIN</option>
            <option value="LOGOUT">LOGOUT</option>
            <option value="SIGNUP">SIGNUP</option>
            <option value="CREATE">CREATE (Document)</option>
            <option value="UPDATE">UPDATE (Document)</option>
            <option value="BATCH_GENERATED">BATCH_GENERATED</option>
            <option value="BATCH_PAID">BATCH_PAID</option>
            <option value="BATCH_DELETED">BATCH_DELETED</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Entity Type</label>
          <select
            value={filterEntityType}
            onChange={(e) => { setFilterEntityType(e.target.value); setPage(1); }}
            className="w-full bg-[#0d1222] border border-white/10 rounded-lg p-2 text-sm text-slate-300 focus:border-cyan-500 focus:outline-none"
          >
            <option value="">All Entities</option>
            <option value="User">User</option>
            <option value="Project">Project</option>
            <option value="Vendor">Vendor</option>
            <option value="Expense">Expense</option>
            <option value="Budget">Budget</option>
            <option value="Reimbursement">Reimbursement</option>
            <option value="Role">Role</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Start Date</label>
          <input
            type="date"
            value={filterStartDate}
            onChange={(e) => { setFilterStartDate(e.target.value); setPage(1); }}
            className="w-full bg-[#0d1222] border border-white/10 rounded-lg p-2 text-sm text-slate-300 focus:border-cyan-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">End Date</label>
          <input
            type="date"
            value={filterEndDate}
            onChange={(e) => { setFilterEndDate(e.target.value); setPage(1); }}
            className="w-full bg-[#0d1222] border border-white/10 rounded-lg p-2 text-sm text-slate-300 focus:border-cyan-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Logs timeline layout */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="flex flex-col items-center space-y-2 text-slate-400">
            <RefreshCw className="h-8 w-8 animate-spin text-cyan-400" />
            <span className="text-sm">Fetching audit trails...</span>
          </div>
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 p-12 text-center bg-[#070b14]/50">
          <History className="mx-auto h-12 w-12 text-slate-600 mb-4" />
          <h3 className="text-base font-semibold text-slate-300">No logs found</h3>
          <p className="mt-1 text-sm text-slate-500">There are no audit log items matching your filters.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-[#0b0f19]/40 border border-white/5 rounded-xl divide-y divide-white/5 shadow-xl">
            {logs.map((log) => {
              const isExpanded = expandedLogId === log._id;
              return (
                <div key={log._id} className="p-4 hover:bg-white/[0.02] transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Log Main Description */}
                    <div className="flex items-start space-x-3">
                      <div className="h-9 w-9 rounded-full bg-white/5 flex items-center justify-center text-slate-400 mt-0.5">
                        <UserIcon className="h-4.5 w-4.5 text-cyan-400" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-slate-200">
                            {log.user?.name || 'System / Guest'}
                          </span>
                          <span className="text-xs text-slate-500">
                            ({log.user?.email || 'automated action'})
                          </span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${getActionBadgeClass(log.action)} uppercase`}>
                            {log.action}
                          </span>
                          {log.entityType && (
                            <span className="text-xs text-slate-400">
                              on <span className="font-semibold text-slate-300">{log.entityType}</span>
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Timestamp: {new Date(log.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Collapsible details trigger */}
                    {log.details && (
                      <button
                        onClick={() => toggleExpandLog(log._id)}
                        className="inline-flex items-center self-start sm:self-center px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 transition-colors"
                      >
                        <Terminal className="mr-1.5 h-3.5 w-3.5 text-cyan-400" />
                        {isExpanded ? 'Hide Payload' : 'Inspect Payload'}
                        {isExpanded ? (
                          <ChevronUp className="ml-1 h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="ml-1 h-3.5 w-3.5" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Expanded JSON details payload */}
                  {isExpanded && log.details && (
                    <div className="mt-4 pt-3 border-t border-white/5 animate-in fade-in slide-in-from-top-1 duration-150">
                      <span className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Audit Event Details</span>
                      <pre className="text-xs bg-black/45 border border-white/5 rounded-xl p-4 font-mono text-cyan-400 overflow-x-auto max-h-64 shadow-inner">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          <div className="flex justify-between items-center bg-[#0b0f19]/40 border border-white/5 rounded-xl px-6 py-4 shadow-xl">
            <span className="text-xs text-slate-500">
              Showing {logs.length} of {total} audit records
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
