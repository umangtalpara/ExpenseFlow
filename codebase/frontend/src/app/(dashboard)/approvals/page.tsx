'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useOrgStore } from '@/store/org.store';
import { Inbox, Settings, History, Check, X, Plus, Trash2, Eye, ShieldAlert, Loader, RefreshCw, Receipt } from 'lucide-react';

interface ApprovalStep {
  stepNumber: number;
  approverRole?: { _id: string; name: string } | string;
  approverUser?: { _id: string; name: string } | string;
}

interface WorkflowConditions {
  minAmount?: number;
  maxAmount?: number;
  category?: { _id: string; name: string } | string;
}

interface ApprovalWorkflow {
  _id: string;
  name: string;
  description?: string;
  status: 'active' | 'inactive';
  isDefault: boolean;
  conditions: WorkflowConditions;
  steps: ApprovalStep[];
}

interface ApprovalHistoryItem {
  stepNumber: number;
  approver: { _id: string; name: string };
  action: 'approved' | 'rejected';
  actionDate: string;
  comment?: string;
}

interface ApprovalRequestItem {
  _id: string;
  expense: {
    _id: string;
    amount: number;
    currency: string;
    convertedAmount: number;
    merchant: string;
    description?: string;
    date: string;
    receiptUrl?: string;
    gst?: number;
    vendor?: string;
    category: { _id: string; name: string };
    employee: { _id: string; name: string; email: string };
    project?: { _id: string; name: string };
  };
  workflow: { _id: string; name: string };
  currentStepNumber: number;
  status: 'pending' | 'approved' | 'rejected';
  history: ApprovalHistoryItem[];
}

export default function ApprovalsPage() {
  const { user: currentUser } = useAuthStore();
  const { currency: orgCurrency } = useOrgStore();
  const [activeTab, setActiveTab] = useState<'inbox' | 'designer' | 'history'>('inbox');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Data collections
  const [inbox, setInbox] = useState<ApprovalRequestItem[]>([]);
  const [workflows, setWorkflows] = useState<ApprovalWorkflow[]>([]);
  const [historyLogs, setHistoryLogs] = useState<ApprovalRequestItem[]>([]);
  
  const [roles, setRoles] = useState<{ _id: string; name: string }[]>([]);
  const [employees, setEmployees] = useState<{ _id: string; name: string }[]>([]);
  const [categories, setCategories] = useState<{ _id: string; name: string }[]>([]);

  // Action modals
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequestItem | null>(null);
  const [actionComment, setActionComment] = useState('');
  const [actionSubmitting, setActionSubmitting] = useState(false);

  // Designer Form State
  const [designerOpen, setDesignerOpen] = useState(false);
  const [newWorkflow, setNewWorkflow] = useState({
    name: '',
    description: '',
    isDefault: false,
    minAmount: 0,
    category: '',
    steps: [] as { stepNumber: number; type: 'role' | 'user'; value: string }[],
  });
  const [designerSubmitting, setDesignerSubmitting] = useState(false);

  const loadAllData = async () => {
    setLoading(true);
    setError('');
    try {
      const [inboxRes, wfRes, historyRes, catRes, roleRes, empRes] = await Promise.all([
        api.get('/approvals/inbox'),
        api.get('/approvals/workflows'),
        api.get('/approvals/history'),
        api.get('/categories'),
        api.get('/roles'),
        api.get('/employees'),
      ]);
      setInbox(inboxRes.data);
      setWorkflows(wfRes.data);
      setHistoryLogs(historyRes.data);
      setCategories(catRes.data);
      setRoles(roleRes.data);
      setEmployees(empRes.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch approval engine data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleActionSubmit = async (action: 'approved' | 'rejected') => {
    if (!selectedRequest) return;
    setActionSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await api.post(`/approvals/${selectedRequest._id}/action`, {
        action,
        comment: actionComment || undefined,
      });
      setSuccess(`Claim ${action} successfully`);
      setSelectedRequest(null);
      setActionComment('');
      loadAllData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit approval action.');
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleCreateWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    setDesignerSubmitting(true);
    setError('');
    setSuccess('');

    // Map designer steps array back to schema format
    const stepsMapped = newWorkflow.steps.map((s) => ({
      stepNumber: s.stepNumber,
      approverRole: s.type === 'role' ? s.value : undefined,
      approverUser: s.type === 'user' ? s.value : undefined,
    }));

    try {
      await api.post('/approvals/workflows', {
        name: newWorkflow.name,
        description: newWorkflow.description || undefined,
        isDefault: newWorkflow.isDefault,
        conditions: {
          minAmount: newWorkflow.minAmount ? Number(newWorkflow.minAmount) : undefined,
          category: newWorkflow.category || undefined,
        },
        steps: stepsMapped,
      });

      setSuccess('Approval workflow rule created successfully');
      setDesignerOpen(false);
      setNewWorkflow({
        name: '',
        description: '',
        isDefault: false,
        minAmount: 0,
        category: '',
        steps: [],
      });
      loadAllData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create workflow rule');
    } finally {
      setDesignerSubmitting(false);
    }
  };

  const handleAddStep = () => {
    setNewWorkflow((prev) => ({
      ...prev,
      steps: [
        ...prev.steps,
        {
          stepNumber: prev.steps.length + 1,
          type: 'role',
          value: '',
        },
      ],
    }));
  };

  const handleRemoveStep = (index: number) => {
    setNewWorkflow((prev) => {
      const updatedSteps = prev.steps
        .filter((_, idx) => idx !== index)
        .map((step, idx) => ({ ...step, stepNumber: idx + 1 }));
      return { ...prev, steps: updatedSteps };
    });
  };

  const handleStepChange = (index: number, field: 'type' | 'value', val: string) => {
    setNewWorkflow((prev) => {
      const updated = [...prev.steps];
      updated[index] = { ...updated[index], [field]: val };
      return { ...prev, steps: updated };
    });
  };

  const handleDeleteWorkflow = async (id: string) => {
    if (!confirm('Are you sure you want to delete this approval rule?')) return;
    setError('');
    setSuccess('');
    try {
      await api.delete(`/approvals/workflows/${id}`);
      setSuccess('Approval workflow rule deleted');
      loadAllData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete workflow rule');
    }
  };

  const isAdmin = currentUser?.role === 'Administrator' || currentUser?.role === 'Organization Admin' || currentUser?.role?.includes('Admin');

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      
      {/* Title Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Approvals Engine</h1>
          <p className="text-sm text-slate-400">Process claims queues, build custom steps, and audit workflows.</p>
        </div>
        <button
          onClick={loadAllData}
          className="p-2.5 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-all duration-200"
          title="Refresh Queues"
        >
          <RefreshCw className="h-4 w-4" />
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

      {/* Tabs */}
      <div className="flex border-b border-white/5 gap-6">
        <button
          onClick={() => setActiveTab('inbox')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all duration-200 ${
            activeTab === 'inbox' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Inbox className="h-4 w-4" />
          Inbox Queue
          {inbox.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-[10px] text-cyan-400 font-bold font-mono">
              {inbox.length}
            </span>
          )}
        </button>
        {isAdmin && (
          <button
            onClick={() => setActiveTab('designer')}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all duration-200 ${
              activeTab === 'designer' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings className="h-4 w-4" />
            Workflow Designer
          </button>
        )}
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all duration-200 ${
            activeTab === 'history' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <History className="h-4 w-4" />
          Audit History Logs
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500 flex items-center justify-center gap-2">
          <Loader className="animate-spin h-5 w-5 text-cyan-500" />
          Loading approvals data...
        </div>
      ) : (
        <>
          {/* TAB 1: INBOX QUEUE */}
          {activeTab === 'inbox' && (
            <div className="grid grid-cols-1 gap-4">
              {inbox.length === 0 ? (
                <div className="p-12 text-center text-slate-500 bg-[#0b0f19]/20 rounded-xl border border-white/5">
                  Your inbox queue is empty. No claims currently require your approval.
                </div>
              ) : (
                inbox.map((item) => (
                  <div key={item._id} className="rounded-xl border border-white/5 bg-[#0b0f19]/40 p-6 flex flex-col md:flex-row justify-between gap-6 hover:border-white/10 transition-all duration-200">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-3">
                        <span className="px-2.5 py-0.5 rounded-md bg-slate-800 text-[10px] text-slate-300 font-bold uppercase tracking-wider font-mono">
                          {item.expense?.category?.name || 'Category'}
                        </span>
                        {item.expense?.project && (
                          <span className="text-xs text-cyan-400 font-semibold">{item.expense.project.name}</span>
                        )}
                      </div>
                      
                      <div className="space-y-1">
                        <h3 className="text-base font-bold text-white tracking-tight">
                          {item.expense?.merchant}
                          {item.expense?.vendor && <span className="text-xs text-slate-400 ml-2">({item.expense.vendor})</span>}
                        </h3>
                        <p className="text-sm text-slate-400">{item.expense?.description || 'No description provided'}</p>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 text-xs">
                        <div>
                          <span className="block text-slate-500 font-semibold uppercase tracking-wider text-[9px]">Filer</span>
                          <span className="text-slate-300 font-semibold">{item.expense?.employee?.name}</span>
                        </div>
                        <div>
                          <span className="block text-slate-500 font-semibold uppercase tracking-wider text-[9px]">Amount</span>
                          <span className="text-white font-bold font-mono">
                            {item.expense?.amount?.toLocaleString(undefined, { style: 'currency', currency: item.expense.currency })}
                          </span>
                        </div>
                        {item.expense?.gst && (
                          <div>
                            <span className="block text-slate-500 font-semibold uppercase tracking-wider text-[9px]">GST</span>
                            <span className="text-slate-300 font-mono">${item.expense.gst}</span>
                          </div>
                        )}
                        <div>
                          <span className="block text-slate-500 font-semibold uppercase tracking-wider text-[9px]">Submission Date</span>
                          <span className="text-slate-400 font-mono">{new Date(item.expense?.date).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {item.expense?.receiptUrl && (
                        <div className="pt-1 text-xs">
                          <a
                            href={item.expense.receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-cyan-400 hover:text-cyan-300 underline font-semibold flex items-center gap-1.5"
                          >
                            <Receipt className="h-3.5 w-3.5" />
                            View Attached Receipt Document
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="flex md:flex-col justify-end items-end gap-3 min-w-[180px]">
                      <div className="text-right text-xs text-slate-400 space-y-1">
                        <span className="block font-semibold">Workflow: {item.workflow?.name}</span>
                        <span className="block text-[10px] text-cyan-500 uppercase tracking-wider font-bold">Step {item.currentStepNumber} pending</span>
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedRequest(item)}
                          className="flex items-center px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold transition-all duration-200 text-xs shadow-lg shadow-cyan-500/10"
                        >
                          <Check className="mr-1.5 h-3.5 w-3.5" />
                          Review / Action
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 2: WORKFLOW DESIGNER (Admin Only) */}
          {activeTab === 'designer' && isAdmin && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-md font-bold text-white tracking-tight">Active Approval Workflow Rules</h3>
                <button
                  onClick={() => setDesignerOpen(true)}
                  className="flex items-center px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-semibold transition-all duration-200 text-xs shadow-lg shadow-cyan-500/25"
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add Rule
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {workflows.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 bg-[#0b0f19]/20 rounded-xl border border-white/5">
                    No approval workflow rules defined yet. Create a default fallback rule.
                  </div>
                ) : (
                  workflows.map((wf) => (
                    <div key={wf._id} className="rounded-xl border border-white/5 bg-[#0b0f19]/40 p-6 flex justify-between gap-6 hover:border-white/10 transition-all duration-200">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-bold text-white">{wf.name}</h4>
                          {wf.isDefault && (
                            <span className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[9px] font-bold tracking-wider uppercase">
                              Default Fallback
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400">{wf.description || 'No description provided.'}</p>
                        
                        {/* Rules criteria */}
                        <div className="pt-2 text-xs flex gap-6 text-slate-300">
                          {wf.conditions.minAmount !== undefined && wf.conditions.minAmount !== null && (
                            <span>Amount Limit: &gt;= ${wf.conditions.minAmount}</span>
                          )}
                          {wf.conditions.category && (
                            <span>Category: {
                              categories.find((c) => c._id === (typeof wf.conditions.category === 'object' ? wf.conditions.category._id : wf.conditions.category))?.name || 'Loaded Category'
                            }</span>
                          )}
                        </div>

                        {/* Steps flow */}
                        <div className="pt-4 flex items-center gap-3 overflow-x-auto text-[10px] font-bold text-slate-400">
                          {wf.steps.map((step, idx) => (
                            <React.Fragment key={idx}>
                              {idx > 0 && <span className="text-slate-600">→</span>}
                              <div className="p-2.5 rounded-lg bg-slate-900 border border-white/5 min-w-[120px] text-center space-y-1">
                                <span className="block text-[8px] text-slate-500 uppercase">Step {step.stepNumber}</span>
                                <span className="block text-slate-200">
                                  {step.approverUser
                                    ? employees.find((e) => e._id === (typeof step.approverUser === 'object' ? step.approverUser._id : step.approverUser))?.name || 'Assignee User'
                                    : roles.find((r) => r._id === (typeof step.approverRole === 'object' ? step.approverRole._id : step.approverRole))?.name || 'Assignee Role'
                                  }
                                </span>
                              </div>
                            </React.Fragment>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-col justify-between items-end">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                          wf.status === 'active'
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            : 'bg-slate-500/10 border border-slate-500/20 text-slate-400'
                        }`}>
                          {wf.status}
                        </span>
                        
                        <button
                          onClick={() => handleDeleteWorkflow(wf._id)}
                          className="p-2 rounded bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all duration-200 mt-4"
                          title="Delete Workflow Rule"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: AUDIT HISTORY LOGS */}
          {activeTab === 'history' && (
            <div className="rounded-xl border border-white/5 bg-[#0b0f19]/40 overflow-hidden shadow-lg">
              <div className="p-6 border-b border-white/5">
                <h3 className="text-md font-bold text-white tracking-tight flex items-center gap-2">
                  <History className="h-4 w-4 text-cyan-400" />
                  Approval Audit Trail Log
                </h3>
              </div>

              {historyLogs.length === 0 ? (
                <div className="p-12 text-center text-slate-500">No approval history items recorded yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs text-slate-300">
                    <thead>
                      <tr className="border-b border-white/5 bg-white/5 text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                        <th className="p-4">Workflow Name</th>
                        <th className="p-4">Filer</th>
                        <th className="p-4">Merchant</th>
                        <th className="p-4 text-right">Amount</th>
                        <th className="p-4">Final Status</th>
                        <th className="p-4">Audit Action History Log</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {historyLogs.map((item) => (
                        <tr key={item._id} className="hover:bg-white/5 transition-colors align-top">
                          <td className="p-4 font-semibold text-slate-200">{item.workflow?.name}</td>
                          <td className="p-4">{item.expense?.employee?.name || 'System / Auto'}</td>
                          <td className="p-4 font-semibold text-white">{item.expense?.merchant || 'Deleted Expense'}</td>
                          <td className="p-4 text-right font-bold font-mono">
                            {item.expense?.amount?.toLocaleString(undefined, { style: 'currency', currency: item.expense.currency || orgCurrency })}
                          </td>
                          <td className="p-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                              item.status === 'approved'
                                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                                : item.status === 'rejected'
                                ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                                : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                            }`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="p-4 space-y-2">
                            {item.history.length === 0 ? (
                              <span className="text-slate-600">Auto-approved or no action taken</span>
                            ) : (
                              item.history.map((log, idx) => (
                                <div key={idx} className="p-2 rounded-lg bg-slate-900 border border-white/5 text-[10px] space-y-1">
                                  <div className="flex justify-between items-center text-slate-400">
                                    <span className="font-semibold text-slate-300">
                                      Step {log.stepNumber}: {log.approver?.name}
                                    </span>
                                    <span>{new Date(log.actionDate).toLocaleString()}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className={`px-1.5 py-0.2 rounded font-bold uppercase text-[8px] ${
                                      log.action === 'approved' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                                    }`}>
                                      {log.action}
                                    </span>
                                    {log.comment && <span className="text-slate-400 text-[10px] italic">&quot;{log.comment}&quot;</span>}
                                  </div>
                                </div>
                              ))
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Review Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedRequest(null)} />
          <div className="relative w-full max-w-md rounded-xl border border-white/5 bg-[#0b0f19] p-6 shadow-2xl space-y-4">
            
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-white">Review Claim</h3>
              <button onClick={() => setSelectedRequest(null)} className="text-slate-500 hover:text-slate-300">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 rounded-lg bg-white/5 border border-white/10 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Claim Amount:</span>
                <span className="text-white font-bold font-mono">
                  {selectedRequest.expense?.amount?.toLocaleString(undefined, { style: 'currency', currency: selectedRequest.expense.currency })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Merchant Name:</span>
                <span className="text-white font-semibold">{selectedRequest.expense?.merchant}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Submitted By:</span>
                <span className="text-white font-semibold">{selectedRequest.expense?.employee?.name}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Approver Remarks / Comments</label>
              <textarea
                value={actionComment}
                onChange={(e) => setActionComment(e.target.value)}
                placeholder="Optionally provide reason or approval remark..."
                className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="px-4 py-2 rounded-lg border border-white/10 hover:bg-white/5 text-slate-200 text-sm font-semibold transition-colors"
              >
                Cancel
              </button>
              
              <button
                type="button"
                onClick={() => handleActionSubmit('rejected')}
                disabled={actionSubmitting}
                className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-semibold transition-colors text-sm flex items-center gap-1"
              >
                <X className="h-4 w-4" />
                Reject
              </button>
              
              <button
                type="button"
                onClick={() => handleActionSubmit('approved')}
                disabled={actionSubmitting}
                className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold transition-colors text-sm flex items-center gap-1"
              >
                <Check className="h-4 w-4" />
                Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Designer Creation Modal */}
      {designerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDesignerOpen(false)} />
          <div className="relative w-full max-w-lg rounded-xl border border-white/5 bg-[#0b0f19] p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-white">Create Approval Rule</h3>
              <button onClick={() => setDesignerOpen(false)} className="text-slate-500 hover:text-slate-300">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateWorkflow} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Rule / Workflow Name</label>
                <input
                  type="text"
                  value={newWorkflow.name}
                  onChange={(e) => setNewWorkflow({ ...newWorkflow, name: e.target.value })}
                  placeholder="Large Travel Reimbursement Rule"
                  className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Description</label>
                <textarea
                  value={newWorkflow.description}
                  onChange={(e) => setNewWorkflow({ ...newWorkflow, description: e.target.value })}
                  placeholder="Applies to travel categories above $500..."
                  className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                  rows={2}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={newWorkflow.isDefault}
                  onChange={(e) => setNewWorkflow({ ...newWorkflow, isDefault: e.target.checked })}
                  className="rounded bg-white/5 border-white/10 text-cyan-500 focus:ring-0"
                />
                <label htmlFor="isDefault" className="text-xs text-slate-300 font-semibold select-none cursor-pointer">
                  Set as Default Organization Fallback Rule
                </label>
              </div>

              <div className="border-t border-white/5 pt-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Conditions Criteria</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400">Min Amount (Base Currency)</label>
                    <input
                      type="number"
                      value={newWorkflow.minAmount}
                      onChange={(e) => setNewWorkflow({ ...newWorkflow, minAmount: Number(e.target.value) })}
                      placeholder="500"
                      className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400">Category Specificity</label>
                    <select
                      value={newWorkflow.category}
                      onChange={(e) => setNewWorkflow({ ...newWorkflow, category: e.target.value })}
                      className="mt-2 w-full rounded-lg border border-white/10 bg-[#0c1020] px-4 py-2.5 text-sm text-white focus:border-cyan-500"
                    >
                      <option value="">Any Category</option>
                      {categories.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="border-t border-white/5 pt-3 space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Sequential Approval Steps</h4>
                  <button
                    type="button"
                    onClick={handleAddStep}
                    className="flex items-center text-cyan-400 hover:text-cyan-300 text-xs font-semibold gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    Add Step
                  </button>
                </div>

                {newWorkflow.steps.length === 0 ? (
                  <div className="p-3 text-center text-slate-500 border border-dashed border-white/10 rounded-lg text-xs">
                    No steps added yet. You must define at least one approval step.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {newWorkflow.steps.map((step, idx) => (
                      <div key={idx} className="flex gap-2 items-center bg-white/5 border border-white/5 p-3 rounded-lg text-xs relative">
                        <div className="shrink-0 font-bold font-mono text-cyan-500 w-6 text-center">
                          #{step.stepNumber}
                        </div>

                        <select
                          value={step.type}
                          onChange={(e) => handleStepChange(idx, 'type', e.target.value as any)}
                          className="rounded-lg border border-white/10 bg-[#0c1020] px-3 py-1.5 text-xs text-white"
                        >
                          <option value="role">Role Approver</option>
                          <option value="user">User Approver</option>
                        </select>

                        <select
                          value={step.value}
                          onChange={(e) => handleStepChange(idx, 'value', e.target.value)}
                          className="flex-1 rounded-lg border border-white/10 bg-[#0c1020] px-3 py-1.5 text-xs text-white"
                          required
                        >
                          <option value="">Select Assignee...</option>
                          {step.type === 'role'
                            ? roles.map((r) => (
                                <option key={r._id} value={r._id}>
                                  {r.name}
                                </option>
                              ))
                            : employees.map((e) => (
                                <option key={e._id} value={e._id}>
                                  {e.name}
                                </option>
                              ))
                          }
                        </select>

                        <button
                          type="button"
                          onClick={() => handleRemoveStep(idx)}
                          className="text-red-400 hover:text-red-300 p-1.5 rounded bg-red-500/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setDesignerOpen(false)}
                  className="px-4 py-2 rounded-lg border border-white/10 hover:bg-white/5 text-slate-200 text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={designerSubmitting || newWorkflow.steps.length === 0}
                  className="px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-semibold transition-colors text-sm"
                >
                  {designerSubmitting ? 'Creating...' : 'Create Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
