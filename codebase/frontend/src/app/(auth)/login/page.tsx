'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PasswordInput } from '@/components/ui/password-input';
import { useAuthStore } from '@/store/auth.store';
import axios from 'axios';

export default function LoginPage() {
  const { setAuth } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await axios.post('http://localhost:3001/auth/login', {
        email,
        password,
      });

      const { accessToken, refreshToken } = response.data;
      // Decode JWT payload locally to get user profile details
      const payloadBase64 = accessToken.split('.')[1];
      const payload = JSON.parse(atob(payloadBase64));

      setAuth(accessToken, refreshToken, {
        id: payload.sub,
        email: payload.email,
        organization: payload.org || '',
        role: payload.role || '',
      });

      setSuccess(true);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0f1d] px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-md shadow-2xl">
        <div>
          <h2 className="mt-2 text-center text-3xl font-extrabold tracking-tight text-white">
            Sign in to <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">ExpenseFlow AI</span>
          </h2>
          <p className="mt-2 text-center text-sm text-slate-400">
            Or{' '}
            <Link href="/signup" className="font-medium text-cyan-400 hover:text-cyan-300 transition-colors">
              create a new organization
            </Link>
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-950/50 border border-red-500/30 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-md bg-emerald-950/50 border border-emerald-500/30 p-4 text-sm text-emerald-400">
            Successfully logged in! Redirecting...
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4 rounded-md">
            <div>
              <label htmlFor="email-address" className="block text-sm font-medium text-slate-300 mb-1">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="password" className="block text-sm font-medium text-slate-300">
                  Password
                </label>
                <Link href="/forgot-password" className="text-xs font-medium text-cyan-400 hover:text-cyan-300 transition-colors">
                  Forgot password?
                </Link>
              </div>
              <PasswordInput
                id="password"
                name="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-md bg-gradient-to-r from-cyan-500 to-blue-600 py-2 px-4 text-sm font-medium text-white hover:from-cyan-400 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-[#0a0f1d] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
