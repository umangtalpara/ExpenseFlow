'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { Shield, Key, Eye, EyeOff, Smartphone, Laptop, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';

interface UserSession {
  _id: string;
  ipAddress: string;
  userAgent: string;
  status: string;
  lastActivity: string;
  createdAt: string;
}

export default function SecuritySettingsPage() {
  const { user } = useAuthStore();
  const [is2faEnabled, setIs2faEnabled] = useState(false);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState('');
  
  // 2FA Setup state
  const [setupMode, setSetupMode] = useState<null | 'generate' | 'verify' | 'disable'>(null);
  const [secret, setSecret] = useState('');
  const [otpauthUrl, setOtpauthUrl] = useState('');
  const [code, setCode] = useState('');
  
  // Loading & error state
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch initial data
  const fetchData = async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch user to check 2FA status
      const userRes = await api.get(`/users/${user.id}`);
      setIs2faEnabled(userRes.data?.isTwoFactorEnabled || false);

      // 2. Fetch active sessions
      const sessionsRes = await api.get('/auth/sessions');
      setSessions(sessionsRes.data || []);

      // 3. Resolve current session ID from JWT
      const token = localStorage.getItem('access_token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setCurrentSessionId(payload.sid || '');
      }
    } catch (err: any) {
      console.error(err);
      setError('Failed to load security settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.id]);

  const handleStartSetup = async () => {
    setActionLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await api.post('/auth/2fa/generate');
      setSecret(res.data.secret);
      setOtpauthUrl(res.data.otpauthUrl);
      setSetupMode('generate');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to generate 2FA key');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await api.post('/auth/2fa/enable', { secret, code });
      setSuccess('Two-factor authentication has been enabled successfully!');
      setIs2faEnabled(true);
      setSetupMode(null);
      setCode('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid validation code. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisable2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await api.post('/auth/2fa/disable', { code });
      setSuccess('Two-factor authentication has been disabled.');
      setIs2faEnabled(false);
      setSetupMode(null);
      setCode('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid verification code.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokeSession = async (id: string) => {
    setActionLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await api.delete(`/auth/sessions/${id}`);
      setSessions((prev) => prev.filter((s) => s._id !== id));
      setSuccess('Login session revoked successfully.');

      // If revoking current session, trigger logout
      if (id === currentSessionId) {
        localStorage.clear();
        window.location.href = '/login';
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to revoke session');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokeOthers = async () => {
    setActionLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await api.delete('/auth/sessions');
      setSessions((prev) => prev.filter((s) => s._id === currentSessionId));
      setSuccess('All other active sessions have been revoked.');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to revoke sessions');
    } finally {
      setActionLoading(false);
    }
  };

  const formatAgent = (ua: string) => {
    if (/chrome/i.test(ua)) return 'Google Chrome';
    if (/firefox/i.test(ua)) return 'Mozilla Firefox';
    if (/safari/i.test(ua) && !/chrome/i.test(ua)) return 'Apple Safari';
    if (/edge/i.test(ua)) return 'Microsoft Edge';
    return 'Web Browser';
  };

  return (
    <div className="space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center">
          <Shield className="mr-3 h-8 w-8 text-cyan-400" />
          Security Settings
        </h1>
        <p className="mt-1.5 text-sm text-slate-400">
          Manage two-factor authentication, active login sessions, and secure access credentials.
        </p>
      </div>

      {/* Status Indicators */}
      {error && (
        <div className="rounded-xl bg-red-950/30 border border-red-500/20 p-4 text-sm text-red-400 flex items-center">
          <AlertTriangle className="h-5 w-5 mr-3 flex-shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl bg-emerald-950/30 border border-emerald-500/20 p-4 text-sm text-emerald-400 flex items-center">
          <CheckCircle className="h-5 w-5 mr-3 flex-shrink-0" />
          {success}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48 bg-white/5 border border-white/10 rounded-2xl">
          <RefreshCw className="h-8 w-8 animate-spin text-cyan-400" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 2FA Panel */}
          <div className="lg:col-span-2 space-y-8">
            <div className="rounded-2xl border border-white/5 bg-[#0b0f19] p-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
                <div className="flex items-center">
                  <Smartphone className="h-6 w-6 text-cyan-400 mr-3" />
                  <div>
                    <h3 className="text-lg font-bold text-white">Two-Factor Authentication (2FA)</h3>
                    <p className="text-xs text-slate-400">Add an extra layer of protection to your account logins.</p>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    is2faEnabled
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {is2faEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>

              {/* Status & Display logic */}
              {setupMode === null && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {is2faEnabled
                      ? 'Your account is secured with two-factor authentication. Logins will prompt you to enter a one-time code generated by your mobile authenticator app (like Google Authenticator, Authy, or Microsoft Authenticator).'
                      : 'Two-factor authentication is currently disabled. We strongly recommend enabling it to verify your identity and protect your sensitive financial records from unauthorized access.'}
                  </p>
                  <div className="pt-2">
                    {is2faEnabled ? (
                      <button
                        onClick={() => setSetupMode('disable')}
                        className="rounded-lg bg-red-950/50 hover:bg-red-900/40 text-red-400 border border-red-500/20 py-2 px-4 text-sm font-semibold transition-colors duration-200"
                      >
                        Disable 2FA
                      </button>
                    ) : (
                      <button
                        onClick={handleStartSetup}
                        disabled={actionLoading}
                        className="rounded-lg bg-cyan-500 text-slate-950 hover:bg-cyan-400 py-2 px-4 text-sm font-semibold transition-colors duration-200 disabled:opacity-50"
                      >
                        Enable Two-Factor Authentication
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Step 1: Scan QR Code */}
              {setupMode === 'generate' && (
                <div className="space-y-6">
                  <div className="p-4 rounded-xl bg-slate-900 border border-white/5 space-y-4 text-center">
                    <p className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
                      Step 1: Scan this QR Code
                    </p>
                    <div className="flex justify-center bg-white p-3 rounded-lg w-48 h-48 mx-auto">
                      <img
                        src={`https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl=${encodeURIComponent(
                          otpauthUrl
                        )}`}
                        alt="QR Code"
                        className="w-full h-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs text-slate-400">
                        Scan the code using your authenticator application. If you cannot scan it, enter this secret key manually:
                      </p>
                      <code className="block bg-slate-950 text-cyan-400 p-2 rounded text-xs select-all tracking-widest font-mono">
                        {secret}
                      </code>
                    </div>
                  </div>

                  <div className="flex justify-between items-center border-t border-white/5 pt-4">
                    <button
                      onClick={() => setSetupMode(null)}
                      className="text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => setSetupMode('verify')}
                      className="rounded-lg bg-cyan-500 text-slate-950 hover:bg-cyan-400 py-2 px-4 text-sm font-semibold transition-colors"
                    >
                      Next: Verify Code
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Verify Code */}
              {setupMode === 'verify' && (
                <form onSubmit={handleConfirmEnable} className="space-y-6">
                  <div className="p-4 rounded-xl bg-slate-900 border border-white/5 space-y-4">
                    <p className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
                      Step 2: Enter Verification Code
                    </p>
                    <p className="text-xs text-slate-400">
                      Input the 6-digit verification code displayed in your authenticator app to finalize setup.
                    </p>
                    <div>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        placeholder="123456"
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-center text-xl tracking-[0.75em] font-mono text-cyan-400 focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center border-t border-white/5 pt-4">
                    <button
                      type="button"
                      onClick={() => setSetupMode('generate')}
                      className="text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={actionLoading || code.length !== 6}
                      className="rounded-lg bg-cyan-500 text-slate-950 hover:bg-cyan-400 py-2 px-4 text-sm font-semibold transition-colors disabled:opacity-50"
                    >
                      {actionLoading ? 'Verifying...' : 'Verify & Enable'}
                    </button>
                  </div>
                </form>
              )}

              {/* Disable Confirmation Form */}
              {setupMode === 'disable' && (
                <form onSubmit={handleDisable2fa} className="space-y-6">
                  <div className="p-4 rounded-xl bg-red-950/10 border border-red-500/10 space-y-4">
                    <p className="text-xs font-semibold text-red-400 uppercase tracking-wider flex items-center">
                      <AlertTriangle className="mr-1.5 h-4 w-4" />
                      Confirm Disabling 2FA
                    </p>
                    <p className="text-xs text-slate-400">
                      Disabling two-factor authentication lowers your account security. Please enter the current 6-digit verification code from your authenticator app to confirm.
                    </p>
                    <div>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        placeholder="123456"
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-center text-xl tracking-[0.75em] font-mono text-white focus:border-red-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center border-t border-white/5 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setSetupMode(null);
                        setCode('');
                      }}
                      className="text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={actionLoading || code.length !== 6}
                      className="rounded-lg bg-red-500 text-white hover:bg-red-400 py-2 px-4 text-sm font-semibold transition-colors disabled:opacity-50"
                    >
                      {actionLoading ? 'Disabling...' : 'Confirm Disable'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Active Sessions Sidebar Panel */}
          <div className="lg:col-span-1 space-y-8">
            <div className="rounded-2xl border border-white/5 bg-[#0b0f19] p-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
                <div className="flex items-center">
                  <Laptop className="h-5 w-5 text-cyan-400 mr-2" />
                  <h3 className="text-sm font-bold text-white">Active Sessions</h3>
                </div>
                {sessions.length > 1 && (
                  <button
                    onClick={handleRevokeOthers}
                    disabled={actionLoading}
                    className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    Revoke Others
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {sessions.map((session) => {
                  const isCurrent = session._id === currentSessionId;
                  return (
                    <div
                      key={session._id}
                      className={`p-3 rounded-xl border transition-all ${
                        isCurrent
                          ? 'bg-cyan-500/5 border-cyan-500/20'
                          : 'bg-slate-900/50 border-white/5 hover:bg-slate-900'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">
                            {formatAgent(session.userAgent)}
                          </p>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">IP: {session.ipAddress}</p>
                          <span className="text-[9px] text-slate-500 mt-1 block">
                            Last Active:{' '}
                            {new Date(session.lastActivity).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        {isCurrent ? (
                          <span className="text-[9px] font-bold text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20 flex-shrink-0">
                            Current
                          </span>
                        ) : (
                          <button
                            onClick={() => handleRevokeSession(session._id)}
                            disabled={actionLoading}
                            className="text-[10px] font-bold text-red-400 hover:text-red-300 transition-colors flex-shrink-0 ml-2"
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
