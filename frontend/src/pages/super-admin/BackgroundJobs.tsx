import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import SuperAdminLayout from '../../components/layout/SuperAdminLayout';
import {
  Layers, CheckCircle2, XCircle, Clock,
  RefreshCw, Play, AlertTriangle, Mail,
  FileText, Bell, CreditCard, Zap,
} from 'lucide-react';

const SuperAdminBackgroundJobs = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'recent' | 'failed'>('overview');
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [success, setSuccess] = useState('');

  const { data: pendingCount } = useQuery({
    queryKey: ['super-admin-payments-count'],
    queryFn: async () => {
      const res = await api.get('/super-admin/payments/pending?limit=1');
      return res.data.meta?.total || 0;
    },
  });

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['background-jobs'],
    queryFn: async () => {
      const res = await api.get('/super-admin/background-jobs');
      return res.data.data;
    },
    refetchInterval: 15000,
  });

  const retryMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const res = await api.post(`/super-admin/background-jobs/${jobId}/retry`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['background-jobs'] });
      setRetryingId(null);
      setSuccess('Job queued for retry!');
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: () => setRetryingId(null),
  });

  const jobs = data;

  const formatDate = (date: string) => new Date(date).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });

  const getQueueIcon = (queue: string) => {
    if (queue?.includes('email')) return Mail;
    if (queue?.includes('invoice')) return FileText;
    if (queue?.includes('subscription')) return CreditCard;
    if (queue?.includes('notification')) return Bell;
    return Zap;
  };

  const getQueueColor = (queue: string) => {
    if (queue?.includes('email')) return { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' };
    if (queue?.includes('invoice')) return { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' };
    if (queue?.includes('subscription')) return { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' };
    if (queue?.includes('notification')) return { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' };
    return { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' };
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500', label: 'Completed' };
      case 'failed':    return { bg: 'bg-red-50',   text: 'text-red-700',   dot: 'bg-red-500',   label: 'Failed' };
      case 'processing':return { bg: 'bg-blue-50',  text: 'text-blue-700',  dot: 'bg-blue-500',  label: 'Processing' };
      case 'pending':   return { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500', label: 'Pending' };
      default:          return { bg: 'bg-slate-50', text: 'text-slate-600', dot: 'bg-slate-400', label: status };
    }
  };

  const tabs = [
    { key: 'overview', label: 'Overview', icon: Layers },
    { key: 'recent', label: 'Recent Jobs', icon: Clock },
    { key: 'failed', label: 'Failed Jobs', icon: XCircle },
  ];

  // Default queues to show even if empty
  const defaultQueues = [
    { queue: 'email-queue', label: 'Email Queue' },
    { queue: 'invoice-queue', label: 'Invoice Queue' },
    { queue: 'subscription-queue', label: 'Subscription Queue' },
    { queue: 'notification-queue', label: 'Notification Queue' },
  ];

  return (
    <SuperAdminLayout pendingCount={pendingCount || 0}>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Background Jobs</h1>
          <p className="text-slate-400 text-sm mt-0.5">Monitor queues, job status and retry failed jobs</p>
        </div>
        <button onClick={() => refetch()} disabled={isFetching}
          className="flex items-center gap-2 text-sm font-medium px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm disabled:opacity-60">
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Success */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl mb-5 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> {success}
        </div>
      )}

      {/* Overall Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Pending', value: jobs?.overall.pending || 0, color: 'text-amber-600', bg: 'bg-amber-50', icon: Clock },
          { label: 'Processing', value: jobs?.overall.processing || 0, color: 'text-blue-600', bg: 'bg-blue-50', icon: RefreshCw },
          { label: 'Completed', value: jobs?.overall.completed || 0, color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle2 },
          { label: 'Failed', value: jobs?.overall.failed || 0, color: 'text-red-600', bg: 'bg-red-50', icon: XCircle },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
            <div className={`w-10 h-10 ${item.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
              <item.icon className={`w-5 h-5 ${item.color}`} />
            </div>
            <div>
              <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
              <p className="text-xs text-slate-400 font-medium">{item.label}</p>
            </div>
          </div>
        ))}
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
            {tab.key === 'failed' && (jobs?.overall.failed || 0) > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                {jobs?.overall.failed}
              </span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm text-slate-400">Loading jobs...</p>
        </div>
      ) : (
        <>
          {/* Overview -- Queue Cards */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {defaultQueues.map((dq) => {
                const qData = jobs?.byQueue?.find((q: any) => q.queue === dq.queue) || {
                  queue: dq.queue, pending: 0, processing: 0, completed: 0, failed: 0, total: 0,
                };
                const Icon = getQueueIcon(dq.queue);
                const colors = getQueueColor(dq.queue);
                const successRate = qData.total > 0
                  ? Math.round((qData.completed / qData.total) * 100)
                  : 100;

                return (
                  <div key={dq.queue} className={`bg-white rounded-xl border ${colors.border} shadow-sm p-5`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 ${colors.bg} rounded-lg flex items-center justify-center`}>
                          <Icon className={`w-4 h-4 ${colors.text}`} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{dq.label}</p>
                          <p className="text-xs text-slate-400">{qData.total} total jobs</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-bold ${successRate >= 90 ? 'text-green-600' : successRate >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
                          {successRate}%
                        </p>
                        <p className="text-xs text-slate-400">success rate</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { label: 'Pending', value: qData.pending, color: 'text-amber-600', bg: 'bg-amber-50' },
                        { label: 'Running', value: qData.processing, color: 'text-blue-600', bg: 'bg-blue-50' },
                        { label: 'Done', value: qData.completed, color: 'text-green-600', bg: 'bg-green-50' },
                        { label: 'Failed', value: qData.failed, color: 'text-red-600', bg: 'bg-red-50' },
                      ].map((stat) => (
                        <div key={stat.label} className={`${stat.bg} rounded-lg p-2 text-center`}>
                          <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                          <p className="text-xs text-slate-500">{stat.label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Progress bar */}
                    {qData.total > 0 && (
                      <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
                        {qData.completed > 0 && (
                          <div className="bg-green-500 h-full" style={{ width: `${(qData.completed / qData.total) * 100}%` }} />
                        )}
                        {qData.processing > 0 && (
                          <div className="bg-blue-500 h-full" style={{ width: `${(qData.processing / qData.total) * 100}%` }} />
                        )}
                        {qData.pending > 0 && (
                          <div className="bg-amber-400 h-full" style={{ width: `${(qData.pending / qData.total) * 100}%` }} />
                        )}
                        {qData.failed > 0 && (
                          <div className="bg-red-500 h-full" style={{ width: `${(qData.failed / qData.total) * 100}%` }} />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Cron Jobs Status */}
              <div className="sm:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <h3 className="text-sm font-semibold text-slate-900">Scheduled Cron Jobs</h3>
                  <span className="text-xs text-slate-400 ml-auto">Auto-refreshes every 15s</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { name: 'Trial Ending Check', schedule: 'Daily 9 AM', status: 'active' },
                    { name: 'Trial Expired Check', schedule: 'Daily 9 AM', status: 'active' },
                    { name: 'Subscription Expiring', schedule: 'Daily 9 AM', status: 'active' },
                    { name: 'Subscription Expired', schedule: 'Daily 9 AM', status: 'active' },
                    { name: 'Data Deletion Check', schedule: 'Daily 9 AM', status: 'active' },
                    { name: 'Invoice Generation', schedule: 'On Payment', status: 'active' },
                  ].map((cron) => (
                    <div key={cron.name} className="flex items-start gap-2 p-3 bg-slate-50 rounded-lg">
                      <span className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0 mt-1.5 animate-pulse" />
                      <div>
                        <p className="text-xs font-semibold text-slate-900">{cron.name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{cron.schedule}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Recent Jobs */}
          {activeTab === 'recent' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <h3 className="text-sm font-semibold text-slate-900">Recent Jobs</h3>
                <span className="text-xs text-slate-400 ml-auto">Last 20</span>
              </div>
              {!jobs?.recentJobs?.length ? (
                <div className="p-12 text-center">
                  <Layers className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">No jobs yet</p>
                  <p className="text-xs text-slate-300 mt-0.5">Jobs will appear here when they run</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Job</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Queue</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Attempts</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {jobs?.recentJobs?.map((job: any) => {
                      const badge = getStatusBadge(job.status);
                      const colors = getQueueColor(job.queue);
                      const Icon = getQueueIcon(job.queue);
                      return (
                        <tr key={job.id} className="hover:bg-slate-50/70">
                          <td className="px-5 py-3.5">
                            <p className="font-medium text-slate-900 text-sm">{job.job_name}</p>
                            <p className="text-xs text-slate-400 font-mono">{job.id.split('-')[0]}...</p>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
                              <Icon className="w-3 h-3" />
                              {job.queue}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${badge.bg} ${badge.text}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                              {badge.label}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="text-sm font-medium text-slate-600">{job.attempts}/{job.max_attempts}</span>
                          </td>
                          <td className="px-5 py-3.5 text-xs text-slate-400">
                            {formatDate(job.created_at)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Failed Jobs */}
          {activeTab === 'failed' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-500" />
                <h3 className="text-sm font-semibold text-slate-900">Failed Jobs</h3>
                {(jobs?.overall.failed || 0) > 0 && (
                  <span className="bg-red-100 text-red-700 text-xs font-bold px-1.5 py-0.5 rounded-full">
                    {jobs?.overall.failed}
                  </span>
                )}
              </div>
              {!jobs?.failedJobs?.length ? (
                <div className="p-12 text-center">
                  <CheckCircle2 className="w-10 h-10 text-green-200 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">No failed jobs</p>
                  <p className="text-xs text-slate-300 mt-0.5">All jobs completed successfully!</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {jobs?.failedJobs?.map((job: any) => {
                    const colors = getQueueColor(job.queue);
                    const Icon = getQueueIcon(job.queue);
                    return (
                      <div key={job.id} className="px-5 py-4 hover:bg-red-50/30">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <div className={`w-8 h-8 ${colors.bg} rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5`}>
                              <Icon className={`w-4 h-4 ${colors.text}`} />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{job.job_name}</p>
                              <p className="text-xs text-slate-400 font-mono mt-0.5">{job.queue}</p>
                              {job.error && (
                                <div className="mt-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                                  <p className="text-xs text-red-600 font-mono">{job.error}</p>
                                </div>
                              )}
                              <div className="flex items-center gap-3 mt-2">
                                <p className="text-xs text-slate-400">Attempts: {job.attempts}/{job.max_attempts}</p>
                                <p className="text-xs text-slate-400">{formatDate(job.created_at)}</p>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700">
                              <XCircle className="w-3 h-3" /> Failed
                            </span>
                            {retryingId === job.id ? (
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-amber-600 font-medium">Sure?</span>
                                <button onClick={() => { retryMutation.mutate(job.id); }}
                                  className="text-xs font-semibold px-2.5 py-1.5 bg-blue-600 text-white rounded-lg">Yes</button>
                                <button onClick={() => setRetryingId(null)}
                                  className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-500">No</button>
                              </div>
                            ) : (
                              <button onClick={() => setRetryingId(job.id)}
                                className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg transition-colors">
                                <Play className="w-3 h-3" /> Retry
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </SuperAdminLayout>
  );
};

export default SuperAdminBackgroundJobs;