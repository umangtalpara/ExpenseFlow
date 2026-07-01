'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { PasswordInput } from '@/components/ui/password-input';
import { useAuthStore } from '@/store/auth.store';
import axios from 'axios';

function AcceptInviteFormContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setAuth } = useAuthStore();

  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Invitation details
  const [inviteDetails, setInviteDetails] = useState<{
    email: string;
    organizationName: string;
    roleName: string;
  } | null>(null);

  // Form details
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    const t = searchParams.get('token');
    if (t) {
      setToken(t);
      verifyToken(t);
    } else {
      setError('Invitation token is missing');
      setLoading(false);
    }
  }, [searchParams]);

  const verifyToken = async (inviteToken: string) => {
    try {
      const response = await axios.get(`http://localhost:3001/invitations/verify/${inviteToken}`);
      setInviteDetails(response.data);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'This invitation is invalid or has expired.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setSubmitting(false);
      return;
    }

    try {
      const response = await axios.post('http://localhost:3001/invitations/accept', {
        token,
        name,
        password,
      });

      const { accessToken, refreshToken } = response.data;
      const payloadBase64 = accessToken.split('.')[1];
      const payload = JSON.parse(atob(payloadBase64));

      setAuth(accessToken, refreshToken, {
        id: payload.sub,
        email: payload.email,
        organization: payload.org || '',
        role: payload.role || '',
      });

      // Redirect to home/dashboard
      router.push('/');
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Onboarding failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0f1d] text-white">
        <p className="text-lg">Verifying invitation token...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0f1d] px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-md shadow-2xl">
        <div>
          <h2 className="mt-2 text-center text-3xl font-extrabold tracking-tight text-white">
            Join <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">{inviteDetails?.organizationName || 'Organization'}</span>
          </h2>
          <p className="mt-2 text-center text-sm text-slate-400">
            Set up your profile to activate your <span className="text-cyan-400 font-semibold">{inviteDetails?.roleName || 'Employee'}</span> account.
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-950/50 border border-red-500/30 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {inviteDetails && (
          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                disabled
                value={inviteDetails.email}
                className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-900/50 px-3 py-2 text-sm text-slate-400 cursor-not-allowed"
              />
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-1">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                placeholder="Jane Doe"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1">
                Password
              </label>
              <PasswordInput
                id="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="•••••••• (Min 6 characters)"
              />
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-slate-300 mb-1">
                Confirm Password
              </label>
              <PasswordInput
                id="confirm-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="group relative flex w-full justify-center rounded-md bg-gradient-to-r from-cyan-500 to-blue-600 py-2 px-4 text-sm font-medium text-white hover:from-cyan-400 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-[#0a0f1d] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
              >
                {submitting ? 'Setting up Profile...' : 'Complete Onboarding'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0f1d] flex items-center justify-center text-white">Loading...</div>}>
      <AcceptInviteFormContent />
    </Suspense>
  );
}
