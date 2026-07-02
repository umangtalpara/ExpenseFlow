'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { API_BASE_URL } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/forgot-password`, {
        email,
      });
      setSuccessMsg(response.data.message || 'Password reset instructions have been generated. Check console.');
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to submit request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0f1d] px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-md shadow-2xl">
        <div>
          <h2 className="mt-2 text-center text-3xl font-extrabold tracking-tight text-white">
            Reset Password
          </h2>
          <p className="mt-2 text-center text-sm text-slate-400">
            Enter your email address and we will generate a token for you.
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-950/50 border border-red-500/30 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="rounded-md bg-emerald-950/50 border border-emerald-500/30 p-4 text-sm text-emerald-400">
            {successMsg}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email-address" className="block text-sm font-medium text-slate-300 mb-1">
              Email address
            </label>
            <input
              id="email-address"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              placeholder="you@example.com"
            />
          </div>

          <div className="flex items-center justify-between text-sm">
            <Link href="/login" className="font-medium text-cyan-400 hover:text-cyan-300 transition-colors">
              Back to login
            </Link>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-md bg-gradient-to-r from-cyan-500 to-blue-600 py-2 px-4 text-sm font-medium text-white hover:from-cyan-400 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-[#0a0f1d] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? 'Sending...' : 'Request reset link'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
