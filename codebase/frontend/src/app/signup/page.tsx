'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/auth.store';

export default function SignupPage() {
  const router = useRouter();
  const signup = useAuthStore((state) => state.signup);
  const [orgName, setOrgName] = useState('');
  const [orgSlug, setOrgSlug] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOrgNameChange = (val: string) => {
    setOrgName(val);
    setOrgSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      await signup({ orgName, orgSlug, adminName, adminEmail, password });
      setSuccess('Organization registered successfully! Redirecting to login...');
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      setError(axiosError.response?.data?.message || 'Failed to register organization');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-lg bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-8 shadow-xl"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">
            Register <span className="text-cyan-400">Organization</span>
          </h1>
          <p className="text-slate-400 text-sm">
            Create an account to start managing expenses across projects
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg p-3 mb-6">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm rounded-lg p-3 mb-6">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">
                Company Name
              </label>
              <input
                type="text"
                required
                value={orgName}
                onChange={(e) => handleOrgNameChange(e.target.value)}
                placeholder="Acme Corp"
                className="w-full h-10 px-4 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">
                Organization URL Slug
              </label>
              <input
                type="text"
                required
                value={orgSlug}
                onChange={(e) => setOrgSlug(e.target.value.toLowerCase())}
                placeholder="acme-corp"
                className="w-full h-10 px-4 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">
                Administrator Name
              </label>
              <input
                type="text"
                required
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                placeholder="John Doe"
                className="w-full h-10 px-4 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">
                Administrator Email
              </label>
              <input
                type="email"
                required
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@company.com"
                className="w-full h-10 px-4 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full h-10 px-4 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          <motion.button
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isSubmitting}
            className="w-full h-10 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-semibold transition-all shadow-lg shadow-cyan-500/10 flex items-center justify-center"
          >
            {isSubmitting ? (
              <span className="border-2 border-white border-t-transparent rounded-full w-5 h-5 animate-spin" />
            ) : (
              'Create Account'
            )}
          </motion.button>
        </form>

        <div className="mt-8 text-center text-sm text-slate-500">
          Already registered?{' '}
          <span
            onClick={() => router.push('/login')}
            className="text-cyan-400 hover:underline cursor-pointer"
          >
            Sign In
          </span>
        </div>
      </motion.div>
    </div>
  );
}
