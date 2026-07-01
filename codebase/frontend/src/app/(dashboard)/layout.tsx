'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth.store';
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  ShieldAlert,
  BadgeCent,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  User as UserIcon,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Employees', href: '/employees', icon: Users },
  { name: 'Projects', href: '/projects', icon: FolderKanban },
  { name: 'Vendors', href: '/vendors', icon: ShieldAlert },
  { name: 'Budgets', href: '/budgets', icon: BadgeCent },
  { name: 'Claims', href: '/claims', icon: FileText },
  { name: 'Org Settings', href: '/settings/organization', icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user, clearAuth } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Simple client-side auth guard redirection
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  const handleLogout = () => {
    clearAuth();
    router.push('/login');
  };

  if (!mounted || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0f1d] text-white">
        <p className="text-lg">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060814] text-slate-100 flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r border-white/5 bg-[#0b0f19] shadow-xl">
        <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto">
          {/* Logo */}
          <div className="flex items-center flex-shrink-0 px-6 mb-6">
            <span className="text-xl font-bold tracking-wider bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              ExpenseFlow AI
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="mt-5 flex-1 px-4 space-y-1">
            {navigation.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                    active
                      ? 'bg-cyan-500/10 text-cyan-400 border-l-2 border-cyan-400'
                      : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                  }`}
                >
                  <item.icon
                    className={`mr-3 h-5 w-5 flex-shrink-0 transition-colors ${
                      active ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Info & Logout Button */}
        <div className="flex-shrink-0 flex border-t border-white/5 p-4 bg-[#080b13]">
          <div className="flex items-center w-full justify-between">
            <div className="flex items-center min-w-0">
              <div className="h-9 w-9 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <UserIcon className="h-5 w-5" />
              </div>
              <div className="ml-3 min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate">{user?.name || user?.email}</p>
                <p className="text-xs text-slate-500 capitalize truncate">{user?.role?.replace('Organization ', '')}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200"
              title="Sign out"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="md:pl-64 flex flex-col flex-1 w-full">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between h-16 bg-[#0b0f19] px-4 border-b border-white/5 sticky top-0 z-40">
          <span className="text-lg font-bold tracking-wider bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            ExpenseFlow AI
          </span>
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-white/5 rounded-lg"
          >
            <Menu className="h-6 w-6" />
          </button>
        </header>

        {/* Mobile Drawer Navigation */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            {/* Overlay backdrop */}
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />

            {/* Sidebar drawer content */}
            <div className="relative flex flex-col w-full max-w-xs bg-[#0b0f19] border-r border-white/5 pt-5 pb-4">
              <div className="absolute top-0 right-0 -mr-12 pt-2">
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                >
                  <X className="h-6 w-6 text-white" />
                </button>
              </div>

              {/* Branding */}
              <div className="flex items-center flex-shrink-0 px-6 mb-6">
                <span className="text-xl font-bold tracking-wider bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                  ExpenseFlow AI
                </span>
              </div>

              {/* Navigation Links */}
              <nav className="mt-5 px-4 space-y-1 overflow-y-auto flex-1">
                {navigation.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`group flex items-center px-4 py-2 text-base font-medium rounded-lg transition-all duration-200 ${
                        active ? 'bg-cyan-500/10 text-cyan-400' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                      }`}
                    >
                      <item.icon className="mr-4 h-6 w-6 flex-shrink-0" />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>

              {/* User profile & Sign out */}
              <div className="border-t border-white/5 p-4 flex items-center justify-between">
                <div className="flex items-center">
                  <div className="h-9 w-9 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                    <UserIcon className="h-5 w-5" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-slate-200">{user?.name || user?.email}</p>
                    <p className="text-xs text-slate-500 capitalize">{user?.role?.replace('Organization ', '')}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-400"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic page content container */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
