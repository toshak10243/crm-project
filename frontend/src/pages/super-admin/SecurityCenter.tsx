import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import api from '../../lib/api';
import SuperAdminLayout from '../../components/layout/SuperAdminLayout';
import {
  Shield, Monitor, Clock, AlertTriangle,
  LogOut, CheckCircle2, XCircle, RefreshCw,
  Smartphone, Globe, Key, ChevronRight,
} from 'lucide-react';

const SuperAdminSecurityCenter = () => {
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'sessions' | 'history' | 'failed'>('sessions');
  const [logoutAllConfirm, setLogoutAllConfirm] = useState(false);
  const [success, setSuccess] = useState('');

  const { data: pendingCount } = useQuery({
    queryKey: ['super-admin-payments-count'],
    queryFn: async () => {
      const res = await api.get('/super-admin/payments/pending?limit=1');
      return res.data.meta?.total || 0;
    },
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['security-data'],
    queryFn: async () => {
      const res = await api.get('/super-admin/security');
      return res.data.data;
    },
    refetchInterval: 30000,
  });

  const logoutAllMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/super-admin/security/logout-all');
      return res.data;
    },
    onSuccess: () => {
      setSuccess('All sessions logged out! Redirecting...');
      setTimeout(() => { logout(); navigate('/super-admin/login'); }, 2000);
    },
  });

  const logoutSessionMutation = useMutation({
    mutationFn: async (tokenId: string) => {
      const res = await api.delete(`/super-admin/security/sessions/${tokenId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-data'] });
      setSuccess('Session logged out!');
      setTimeout(() => setSuccess(''), 3000);
    },
  });

  const security = data;

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const tabs = [
    { key: 'sessions', label: 'Active Sessions', icon: Monitor },
    { key: 'history', label: 'Login History', icon: Clock },
    { key: 'failed', label: 'Failed Attempts', icon: AlertTriangle },
  ];

  return (
    <SuperAdminLayout pendingCount={pendingCount || 0}>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Security Center</h1>
          <p className="text-slate-400 text-sm mt-0.5">Monitor sessions, login history and suspicious activity</p>
        </div>
        <button onClick={() => refetch()}
          className="flex items-center gap-2 text-sm font-medium px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Success */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl mb-5 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> {success}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
            <Monitor className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{security?.stats.activeSessions || 0}</p>
            <p className="text-xs text-slate-400 font-medium">Active Sessions</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
          <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{security?.stats.loginsToday || 0}</p>
            <p className="text-xs text-slate-400 font-medium">Logins Today</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${(security?.stats.failedToday || 0) > 0 ? 'bg-red-50' : 'bg-slate-50'}`}>
            <AlertTriangle className={`w-5 h-5 ${(security?.stats.failedToday || 0) > 0 ? 'text-red-600' : 'text-slate-400'}`} />
          </div>
          <div>
            <p className={`text-2xl font-bold ${(security?.stats.failedToday || 0) > 0 ? 'text-red-600' : 'text-slate-900'}`}>
              {security?.stats.failedToday || 0}
            </p>
            <p className="text-xs text-slate-400 font-medium">Failed Today</p>
          </div>
        </div>
      </div>

      {/* Logout All Sessions */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LogOut className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-800">Logout All Sessions</p>
            <p className="text-xs text-red-600">This will log out all active sessions including your current one</p>
          </div>
        </div>
        {logoutAllConfirm ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-red-700 font-medium">Are you sure?</span>
            <button onClick={() => logoutAllMutation.mutate()} disabled={logoutAllMutation.isPending}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg disabled:opacity-60">
              {logoutAllMutation.isPending ? 'Logging out...' : 'Yes, Logout All'}
            </button>
            <button onClick={() => setLogoutAllConfirm(false)}
              className="px-3 py-1.5 border border-red-200 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50">
              Cancel
            </button>
          </div>
        ) : (
          <button onClick={() => setLogoutAllConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors">
            <LogOut className="w-4 h-4" /> Logout All
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-5 w-fit">
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}>
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm text-slate-400">Loading security data...</p>
        </div>
      ) : (
        <>
          {/* Active Sessions */}
          {activeTab === 'sessions' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                <Monitor className="w-4 h-4 text-slate-400" />
                <h3 className="text-sm font-semibold text-slate-900">Active Sessions</h3>
                <span className="bg-blue-100 text-blue-700 text-xs font-bold px-1.5 py-0.5 rounded-full ml-1">
                  {security?.activeSessions?.length || 0}
                </span>
              </div>
              {security?.activeSessions?.length === 0 ? (
                <div className="p-12 text-center">
                  <Monitor className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">No active sessions</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {security?.activeSessions?.map((session: any) => (
                    <div key={session.id} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Monitor className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{session.name}</p>
                          <p className="text-xs text-slate-400">{session.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xs text-slate-500">Created: {formatDate(session.created_at)}</p>
                          <p className="text-xs text-slate-400">Expires: {formatDate(session.expires_at)}</p>
                        </div>
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <button onClick={() => logoutSessionMutation.mutate(session.id)}
                          disabled={logoutSessionMutation.isPending}
                          className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <LogOut className="w-3.5 h-3.5" /> Logout
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Login History */}
          {activeTab === 'history' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <h3 className="text-sm font-semibold text-slate-900">Login History</h3>
                <span className="text-xs text-slate-400 ml-auto">Last 20 records</span>
              </div>
              {security?.loginHistory?.length === 0 ? (
                <div className="p-12 text-center">
                  <Clock className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">No login history yet</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Admin</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Device</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">IP Address</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {security?.loginHistory?.map((log: any) => (
                      <tr key={log.id} className="hover:bg-slate-50/70">
                        <td className="px-5 py-3.5">
                          <p className="font-medium text-slate-900">{log.name}</p>
                          <p className="text-xs text-slate-400">{log.email}</p>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5">
                            {log.device === 'Mobile' ? <Smartphone className="w-3.5 h-3.5 text-slate-400" /> : <Monitor className="w-3.5 h-3.5 text-slate-400" />}
                            <span className="text-xs text-slate-600">{log.device || 'Unknown'}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <Globe className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-xs font-mono text-slate-600">{log.ip_address === '::1' ? '127.0.0.1' : log.ip_address || '—'}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                            log.status === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                          }`}>
                            {log.status === 'success'
                              ? <><CheckCircle2 className="w-3 h-3" /> Success</>
                              : <><XCircle className="w-3 h-3" /> Failed</>
                            }
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-400">
                          {formatDate(log.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Failed Attempts */}
          {activeTab === 'failed' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <h3 className="text-sm font-semibold text-slate-900">Failed Login Attempts</h3>
                {(security?.stats.failedToday || 0) > 0 && (
                  <span className="bg-red-100 text-red-700 text-xs font-bold px-1.5 py-0.5 rounded-full ml-1">
                    {security?.stats.failedToday} today
                  </span>
                )}
                <span className="text-xs text-slate-400 ml-auto">Last 20 records</span>
              </div>
              {security?.failedAttempts?.length === 0 ? (
                <div className="p-12 text-center">
                  <Shield className="w-10 h-10 text-green-200 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">No failed attempts</p>
                  <p className="text-xs text-slate-300 mt-0.5">All good!</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Identifier</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">IP Address</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Reason</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {security?.failedAttempts?.map((attempt: any) => (
                      <tr key={attempt.id} className="hover:bg-red-50/30">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <Key className="w-3.5 h-3.5 text-red-400" />
                            <span className="text-sm font-mono text-slate-700">{attempt.identifier}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <Globe className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-xs font-mono text-slate-600">{attempt.ip_address === '::1' ? '127.0.0.1' : attempt.ip_address || '—'}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600">
                            <XCircle className="w-3 h-3" />
                            {attempt.reason || 'Invalid credentials'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-400">
                          {formatDate(attempt.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      )}
    </SuperAdminLayout>
  );
};

export default SuperAdminSecurityCenter;