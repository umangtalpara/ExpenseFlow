'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useOrgStore } from '@/store/org.store';
import {
  Building2,
  Users2,
  FolderKanban,
  ShieldCheck,
  RefreshCw,
  TrendingUp,
  PieChart,
  BarChart,
  DollarSign,
  AlertCircle,
  Folder,
  Layers,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';

interface DashboardData {
  cards: {
    totalExpenses: number;
    monthlyExpenses: number;
    pendingCount: number;
    pendingAmount: number;
    approvedCount: number;
    approvedAmount: number;
    rejectedCount: number;
    rejectedAmount: number;
    budgetUsed: number;
    budgetRemaining: number;
    activeProjects: number;
    activeEmployees: number;
    activeVendors: number;
    totalReimbursement: number;
  };
  charts: {
    monthlySpending: { month: string; amount: number }[];
    categorySpending: { category: string; amount: number }[];
    projectSpending: { project: string; amount: number }[];
    departmentSpending: { department: string; amount: number }[];
    vendorSpending: { vendor: string; amount: number }[];
    paymentMethodSpending: { paymentMethod: string; amount: number }[];
  };
}

const DONUT_COLORS = ['#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#64748b'];

export default function DashboardHome() {
  const { user } = useAuthStore();
  const [metrics, setMetrics] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchMetrics = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/analytics/dashboard');
      setMetrics(response.data);
    } catch (err: any) {
      console.error('Dashboard metrics load failed', err);
      setError(err.response?.data?.message || 'Failed to retrieve real-time dashboard analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const { currency: orgCurrency } = useOrgStore();

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-IN', { style: 'currency', currency: orgCurrency });
  };

  if (loading) {
    return (
      <div className="flex h-[75vh] items-center justify-center">
        <div className="flex flex-col items-center space-y-2 text-slate-400">
          <RefreshCw className="h-8 w-8 animate-spin text-cyan-400" />
          <span className="text-sm">Fetching organization dashboard telemetry...</span>
        </div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-center text-red-400 flex flex-col items-center max-w-lg mx-auto mt-20 space-y-3">
        <AlertCircle className="h-10 w-10 text-red-400" />
        <h3 className="font-bold text-white">Telemetry Failure</h3>
        <p className="text-sm">{error || 'Unable to retrieve dashboard metrics'}</p>
        <button
          onClick={fetchMetrics}
          className="mt-4 px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-300 text-xs font-semibold"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const roleName = user?.role || 'Employee';
  const isAdmin = roleName === 'Organization Admin' || roleName.includes('Admin');
  const isPM = roleName === 'Project Manager';

  // SVG Donut Calculations
  const totalCatSpending = metrics.charts.categorySpending.reduce((sum, item) => sum + item.amount, 0);
  let accumulatedPercentage = 0;
  const donutData = metrics.charts.categorySpending.slice(0, 5).map((item, idx) => {
    const percentage = totalCatSpending > 0 ? (item.amount / totalCatSpending) * 100 : 0;
    const offset = accumulatedPercentage;
    accumulatedPercentage += percentage;
    return {
      ...item,
      percentage,
      offset,
      color: DONUT_COLORS[idx % DONUT_COLORS.length],
    };
  });

  // SVG Bar Chart Calculations
  const maxMonthlyAmount = Math.max(...metrics.charts.monthlySpending.map((m) => m.amount), 1);
  const barChartHeight = 120;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Welcome Banner */}
      <div className="relative rounded-2xl overflow-hidden border border-white/5 bg-gradient-to-br from-[#0c1020] to-[#080b13] p-8 md:p-10 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="relative z-10 space-y-3 max-w-2xl">
          <span className="text-cyan-400 text-sm font-semibold tracking-wider uppercase">
            {roleName.replace('Organization ', '')} Dashboard
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
            Welcome back, <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">{user?.name || 'User'}</span>!
          </h1>
          <p className="text-slate-400 text-base leading-relaxed">
            {isAdmin
              ? 'Complete financial visibility of budgets, dynamic approval workflows, reimbursement ledgers, and department spending.'
              : isPM
              ? 'Manage budgets, approvals, and vendor invoices for your assigned projects.'
              : 'Track your submitted expense claims, check reimbursement status, and manage personal accounts.'}
          </p>
          <div className="pt-2 flex flex-wrap gap-4">
            {isAdmin && (
              <>
                <Link
                  href="/employees"
                  className="px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-semibold transition-all duration-200 shadow-lg shadow-cyan-500/25 text-sm"
                >
                  Onboard Team
                </Link>
                <Link
                  href="/reimbursements"
                  className="px-5 py-2.5 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-slate-200 font-semibold transition-all duration-200 text-sm"
                >
                  Disburse Batches
                </Link>
              </>
            )}
            {!isAdmin && !isPM && (
              <Link
                href="/claims"
                className="px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-semibold transition-all duration-200 shadow-lg shadow-cyan-500/25 text-sm"
              >
                Submit Expense Claim
              </Link>
            )}
            {(isAdmin || isPM) && (
              <Link
                href="/reports"
                className="px-5 py-2.5 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-slate-200 font-semibold transition-all duration-200 text-sm"
              >
                Generate Export Reports
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total Spending */}
        <div className="rounded-xl border border-white/5 bg-[#0b0f19]/60 backdrop-blur-md p-6 shadow-lg hover:border-white/10 transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-400">Total Disbursements</span>
            <div className="h-10 w-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-bold text-white tracking-tight">{formatCurrency(metrics.cards.totalExpenses)}</span>
            <p className="mt-1 text-xs text-slate-500">Approved & paid ledgers</p>
          </div>
        </div>

        {/* Card 2: Current Month Spending */}
        <div className="rounded-xl border border-white/5 bg-[#0b0f19]/60 backdrop-blur-md p-6 shadow-lg hover:border-white/10 transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-400">Current Month Spent</span>
            <div className="h-10 w-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-bold text-white tracking-tight">{formatCurrency(metrics.cards.monthlyExpenses)}</span>
            <p className="mt-1 text-xs text-slate-500">Disbursed this month</p>
          </div>
        </div>

        {/* Card 3: Pending Approvals */}
        <div className="rounded-xl border border-white/5 bg-[#0b0f19]/60 backdrop-blur-md p-6 shadow-lg hover:border-white/10 transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-400">Awaiting Approvals</span>
            <div className="h-10 w-10 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-bold text-white tracking-tight">{metrics.cards.pendingCount} Claims</span>
            <p className="mt-1 text-xs text-slate-400">
              Value: <span className="text-yellow-400 font-bold">{formatCurrency(metrics.cards.pendingAmount)}</span>
            </p>
          </div>
        </div>

        {/* Card 4: Role-specific Card */}
        {isAdmin || isPM ? (
          <div className="rounded-xl border border-white/5 bg-[#0b0f19]/60 backdrop-blur-md p-6 shadow-lg hover:border-white/10 transition-all duration-300">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-400">Active Directory</span>
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Users2 className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 flex gap-4 text-sm text-slate-300">
              <div>
                <span className="block font-bold text-white text-base">{metrics.cards.activeProjects}</span>
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Projects</span>
              </div>
              <div>
                <span className="block font-bold text-white text-base">{metrics.cards.activeEmployees}</span>
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Employees</span>
              </div>
              <div>
                <span className="block font-bold text-white text-base">{metrics.cards.activeVendors}</span>
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Vendors</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-white/5 bg-[#0b0f19]/60 backdrop-blur-md p-6 shadow-lg hover:border-white/10 transition-all duration-300">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-400">Paid Reimbursements</span>
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Wallet className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-2xl font-bold text-white tracking-tight">{formatCurrency(metrics.cards.totalReimbursement)}</span>
              <p className="mt-1 text-xs text-slate-500">Credited to your profile</p>
            </div>
          </div>
        )}
      </div>

      {/* Admin / PM Budgets Visual Bar */}
      {(isAdmin || isPM) && (
        <div className="rounded-2xl border border-white/5 bg-[#0b0f19]/40 p-6 space-y-4">
          <div className="flex justify-between items-center text-sm">
            <span className="font-semibold text-slate-300 flex items-center">
              <Building2 className="mr-2 h-4 w-4 text-cyan-400" />
              Corporate Budget Utilization
            </span>
            <span className="text-slate-400 font-medium">
              Used: <span className="text-cyan-400 font-bold">{formatCurrency(metrics.cards.budgetUsed)}</span> / Total Limit:{' '}
              <span className="text-white font-bold">{formatCurrency(metrics.cards.budgetUsed + metrics.cards.budgetRemaining)}</span>
            </span>
          </div>
          <div className="relative w-full h-3 bg-white/5 rounded-full overflow-hidden border border-white/5">
            <div
              className="absolute left-0 top-0 h-full bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full transition-all duration-500"
              style={{
                width: `${
                  metrics.cards.budgetUsed + metrics.cards.budgetRemaining > 0
                    ? (metrics.cards.budgetUsed / (metrics.cards.budgetUsed + metrics.cards.budgetRemaining)) * 100
                    : 0
                }%`,
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-500">
            <span>{((metrics.cards.budgetUsed / (metrics.cards.budgetUsed + metrics.cards.budgetRemaining || 1)) * 100).toFixed(1)}% Used</span>
            <span>{formatCurrency(metrics.cards.budgetRemaining)} Remaining</span>
          </div>
        </div>
      )}

      {/* Analytics Charts Panels */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Chart Panel 1: Monthly Trend */}
        <div className="rounded-2xl border border-white/5 bg-[#0b0f19]/40 p-6 flex flex-col">
          <h3 className="text-sm font-semibold text-slate-300 flex items-center mb-6">
            <BarChart className="mr-2 h-4 w-4 text-purple-400" />
            Monthly Spending Trend
          </h3>
          {metrics.charts.monthlySpending.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-10 text-slate-500 text-sm">
              No monthly data records found
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-end">
              <div className="flex items-end justify-between h-[150px] px-4 border-b border-white/5 pb-2">
                {metrics.charts.monthlySpending.map((m) => {
                  const pct = (m.amount / maxMonthlyAmount) * 100;
                  return (
                    <div key={m.month} className="flex flex-col items-center flex-1 group">
                      <div className="relative w-7 bg-white/5 rounded-t-md hover:bg-white/10 transition-colors flex items-end h-[120px] justify-center">
                        <div
                          className="w-full bg-gradient-to-t from-purple-600 to-cyan-400 rounded-t-md transition-all duration-500 group-hover:from-purple-500 group-hover:to-cyan-300"
                          style={{ height: `${pct}%` }}
                        />
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-2 bg-slate-900 border border-white/10 rounded px-2 py-1 text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                          {formatCurrency(m.amount)}
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-500 mt-2 font-medium">{m.month.split(' ')[0]}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Chart Panel 2: Category Breakdown */}
        <div className="rounded-2xl border border-white/5 bg-[#0b0f19]/40 p-6">
          <h3 className="text-sm font-semibold text-slate-300 flex items-center mb-6">
            <PieChart className="mr-2 h-4 w-4 text-cyan-400" />
            Category Spending Distribution
          </h3>
          {totalCatSpending === 0 ? (
            <div className="flex items-center justify-center py-12 text-slate-500 text-sm">
              No category spending recorded
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
              {/* Circular SVG Donut */}
              <div className="relative h-32 w-32">
                <svg viewBox="0 0 36 36" className="h-full w-full transform -rotate-90">
                  <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="3" />
                  {donutData.map((d, idx) => {
                    const strokeDasharray = `${d.percentage} ${100 - d.percentage}`;
                    const strokeDashoffset = 100 - d.offset;
                    return (
                      <circle
                        key={idx}
                        cx="18"
                        cy="18"
                        r="15.915"
                        fill="none"
                        stroke={d.color}
                        strokeWidth="3.2"
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={strokeDashoffset}
                        className="transition-all duration-500"
                      />
                    );
                  })}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Total</span>
                  <span className="text-xs font-bold text-white truncate max-w-[90px]">{formatCurrency(totalCatSpending)}</span>
                </div>
              </div>

              {/* Legends list */}
              <div className="flex-1 space-y-2">
                {donutData.map((d, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs">
                    <div className="flex items-center">
                      <span className="h-2.5 w-2.5 rounded-full mr-2" style={{ backgroundColor: d.color }} />
                      <span className="text-slate-400 font-medium truncate max-w-[120px]">{d.category}</span>
                    </div>
                    <span className="font-bold text-slate-200">{d.percentage.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Project Spending Progress list */}
      {(isAdmin || isPM) && (
        <div className="rounded-2xl border border-white/5 bg-[#0b0f19]/40 p-6 space-y-4">
          <h3 className="text-sm font-semibold text-slate-300 flex items-center">
            <Folder className="mr-2 h-4 w-4 text-emerald-400" />
            Spending Breakdown by Project
          </h3>
          {metrics.charts.projectSpending.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-sm">No project metrics available</div>
          ) : (
            <div className="space-y-4">
              {metrics.charts.projectSpending.slice(0, 5).map((p, idx) => {
                const maxAmount = metrics.charts.projectSpending[0]?.amount || 1;
                const progressWidth = (p.amount / maxAmount) * 100;
                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-slate-300">{p.project}</span>
                      <span className="text-white font-bold">{formatCurrency(p.amount)}</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                        style={{ width: `${progressWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
