'use client';

import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { Search, Loader2, Users, FolderKanban, ShieldCheck, FileText, X } from 'lucide-react';

interface SearchResults {
  users: any[];
  projects: any[];
  vendors: any[];
  expenses: any[];
}

export function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<SearchResults>({
    users: [],
    projects: [],
    vendors: [],
    expenses: [],
  });

  const searchRef = useRef<HTMLDivElement>(null);

  // Debounced search effect
  useEffect(() => {
    if (!query.trim()) {
      setResults({ users: [], projects: [], vendors: [], expenses: [] });
      setLoading(false);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await api.get(`/search?q=${encodeURIComponent(query)}`);
        setResults(response.data);
        setIsOpen(true);
      } catch (err) {
        console.error('Search request failed:', err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [query]);

  // Handle outside clicks to close the dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectResult = (route: string) => {
    router.push(route);
    setIsOpen(false);
    setQuery('');
  };

  const hasResults =
    results.users.length > 0 ||
    results.projects.length > 0 ||
    results.vendors.length > 0 ||
    results.expenses.length > 0;

  return (
    <div ref={searchRef} className="relative w-full">
      {/* Search Input Container */}
      <div className="relative flex items-center">
        <Search className="absolute left-3.5 h-4.5 w-4.5 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search employees, projects, vendors..."
          className="w-full bg-[#0d1222] border border-white/10 hover:border-white/20 focus:border-cyan-500/50 rounded-xl py-2 pl-11 pr-10 text-sm text-slate-200 placeholder-slate-500 outline-none transition-all duration-300 focus:ring-2 focus:ring-cyan-500/10 focus:shadow-lg focus:shadow-cyan-500/5"
        />
        {loading ? (
          <Loader2 className="absolute right-3.5 h-4.5 w-4.5 animate-spin text-cyan-400" />
        ) : (
          query && (
            <button
              onClick={() => {
                setQuery('');
                setIsOpen(false);
              }}
              className="absolute right-3.5 p-0.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )
        )}
      </div>

      {/* Floating Dropdown Results */}
      {isOpen && query.trim() && (
        <div className="absolute left-0 right-0 mt-2 max-h-[480px] overflow-y-auto rounded-2xl border border-white/5 bg-[#0b0f19]/95 backdrop-blur-xl shadow-2xl z-50 p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          {!loading && !hasResults && (
            <div className="text-center py-6 text-sm text-slate-500">
              No matching records found for &quot;<span className="text-slate-300 font-semibold">{query}</span>&quot;
            </div>
          )}

          {/* Group 1: Employees */}
          {results.users.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold tracking-wider text-slate-500 uppercase flex items-center px-2">
                <Users className="mr-2 h-3.5 w-3.5 text-cyan-400" />
                Employees ({results.users.length})
              </h3>
              <div className="grid grid-cols-1 gap-1">
                {results.users.map((user) => (
                  <button
                    key={user._id}
                    onClick={() => handleSelectResult(`/employees`)}
                    className="flex items-center w-full px-2 py-2 rounded-lg hover:bg-white/5 text-left text-sm text-slate-300 hover:text-white transition-all duration-150"
                  >
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-xs text-slate-500">
                        {user.email} {user.employeeId ? `• ID: ${user.employeeId}` : ''}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Group 2: Projects */}
          {results.projects.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold tracking-wider text-slate-500 uppercase flex items-center px-2">
                <FolderKanban className="mr-2 h-3.5 w-3.5 text-purple-400" />
                Projects ({results.projects.length})
              </h3>
              <div className="grid grid-cols-1 gap-1">
                {results.projects.map((proj) => (
                  <button
                    key={proj._id}
                    onClick={() => handleSelectResult(`/projects`)}
                    className="flex items-center w-full px-2 py-2 rounded-lg hover:bg-white/5 text-left text-sm text-slate-300 hover:text-white transition-all duration-150"
                  >
                    <div>
                      <p className="font-medium">{proj.name}</p>
                      <p className="text-xs text-slate-500">
                        Code: <span className="text-purple-400">{proj.code}</span> {proj.client ? `• Client: ${proj.client}` : ''}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Group 3: Vendors */}
          {results.vendors.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold tracking-wider text-slate-500 uppercase flex items-center px-2">
                <ShieldCheck className="mr-2 h-3.5 w-3.5 text-emerald-400" />
                Vendors ({results.vendors.length})
              </h3>
              <div className="grid grid-cols-1 gap-1">
                {results.vendors.map((vendor) => (
                  <button
                    key={vendor._id}
                    onClick={() => handleSelectResult(`/vendors`)}
                    className="flex items-center w-full px-2 py-2 rounded-lg hover:bg-white/5 text-left text-sm text-slate-300 hover:text-white transition-all duration-150"
                  >
                    <div>
                      <p className="font-medium">{vendor.name}</p>
                      <p className="text-xs text-slate-500">
                        Company: {vendor.company} {vendor.gstPan ? `• PAN/GST: ${vendor.gstPan}` : ''}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Group 4: Expenses */}
          {results.expenses.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold tracking-wider text-slate-500 uppercase flex items-center px-2">
                <FileText className="mr-2 h-3.5 w-3.5 text-yellow-400" />
                Expense Claims ({results.expenses.length})
              </h3>
              <div className="grid grid-cols-1 gap-1">
                {results.expenses.map((exp) => (
                  <button
                    key={exp._id}
                    onClick={() => handleSelectResult(`/claims`)}
                    className="flex items-center w-full px-2 py-2 rounded-lg hover:bg-white/5 text-left text-sm text-slate-300 hover:text-white transition-all duration-150"
                  >
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <p className="font-medium truncate max-w-[150px]">{exp.merchant}</p>
                        <p className="font-semibold text-cyan-400">
                          {exp.amount} {exp.currency}
                        </p>
                      </div>
                      <p className="text-xs text-slate-500 truncate max-w-[240px]">
                        Submitted by: {exp.employee?.name || 'Unknown'} {exp.project ? `• Project: ${exp.project.name}` : ''}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
