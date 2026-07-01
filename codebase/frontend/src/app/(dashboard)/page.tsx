'use client';

import React from 'react';
import { useAuthStore } from '@/store/auth.store';
import { Building2, Users2, FolderKanban, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default function DashboardHome() {
  const { user } = useAuthStore();

  const stats = [
    { name: 'Total Claims', value: '$0.00', icon: Building2, desc: 'Reimbursements issued' },
    { name: 'Active Employees', value: '1', icon: Users2, desc: 'Registered in directory' },
    { name: 'Active Projects', value: '0', icon: FolderKanban, desc: 'Assigned and tracked' },
    { name: 'Pending Approvals', value: '0', icon: ShieldCheck, desc: 'Awaiting manager sign-off' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Welcome Banner */}
      <div className="relative rounded-2xl overflow-hidden border border-white/5 bg-gradient-to-br from-[#0c1020] to-[#080b13] p-8 md:p-10 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="relative z-10 space-y-3 max-w-2xl">
          <span className="text-cyan-400 text-sm font-semibold tracking-wider uppercase">Workspace Overview</span>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
            Welcome back, <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">{user?.name || 'User'}</span>!
          </h1>
          <p className="text-slate-400 text-base leading-relaxed">
            Manage your organization profile, configure departments & designations, and view the employee directory to onboard your team.
          </p>
          <div className="pt-2 flex flex-wrap gap-4">
            <Link
              href="/employees"
              className="px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-semibold transition-all duration-200 shadow-lg shadow-cyan-500/25 text-sm"
            >
              Manage Employees
            </Link>
            <Link
              href="/settings/organization"
              className="px-5 py-2.5 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-slate-200 font-semibold transition-all duration-200 text-sm"
            >
              Organization Settings
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="rounded-xl border border-white/5 bg-[#0b0f19]/60 backdrop-blur-md p-6 shadow-lg hover:border-white/10 hover:shadow-2xl transition-all duration-300"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-400">{stat.name}</span>
              <div className="h-10 w-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <stat.icon className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-2xl font-bold text-white tracking-tight">{stat.value}</span>
              <p className="mt-1 text-xs text-slate-500">{stat.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
