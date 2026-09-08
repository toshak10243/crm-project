import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import SuperAdminLayout from '../../components/layout/SuperAdminLayout';
import {
  Activity, Database, Mail, Cpu,
  MemoryStick, Clock, RefreshCw, Server,
  Zap, HardDrive, Users, ChevronRight,
} from 'lucide-react';

const SuperAdminSystemHealth = () => {
  const navigate = useNavigate();

  const { data: pendingCount } = useQuery({
    queryKey: ['super-admin-payments-count'],
    queryFn: async () => {
      const res = await api.get('/super-admin/payments/pending?limit=1');
      return res.data.meta?.total || 0;
    },
  });

  const { data, isLoading, refetch, isFetching, dataUpdatedAt } = useQuery({
    queryKey: ['system-health'],
    queryFn: async () => {
      const res = await api.get('/super-admin/system-health');
      return res.data.data;
    },
    refetchInterval: 30000,
  });

  const health = data;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational': return { dot: 'bg-green-500', text: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', label: 'Operational' };
      case 'degraded':    return { dot: 'bg-amber-500', text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', label: 'Degraded' };
      case 'down':        return { dot: 'bg-red-500',   text: 'text-red-600',   bg: 'bg-red-50',   border: 'border-red-200',   label: 'Down' };
      default:            return { dot: 'bg-slate-400', text: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-200', label: 'Unknown' };
    }
  };

  const getMemoryColor = (pct: number) => {
    if (pct >= 85) return 'bg-red-500';
    if (pct >= 65) return 'bg-amber-500';
    return 'bg-green-500';
  };

  const services = health ? [
    {
      name: 'API Server',
      key: 'api',
      icon: Server,
      status: health.services.api.status,
      meta: `${health.services.api.responseTime}ms response time`,
      detail: 'NestJS REST API',
    },
    {
      name: 'PostgreSQL',
      key: 'database',
      icon: Database,
      status: health.services.database.status,
      meta: `${health.services.database.responseTime}ms ping`,
      detail: `${health.services.database.activeConnections} active connections`,
    },
    {
      name: 'Redis',
      key: 'redis',
      icon: Zap,
      status: health.services.redis.status,
      meta: 'Cache & Queue store',
      detail: 'Connected',
    },
    {
      name: 'Email Service',
      key: 'email',
      icon: Mail,
      status: health.services.email.status,
      meta: 'SMTP via Nodemailer',
      detail: 'Gmail SMTP',
    },
    {
      name: 'Background Jobs',
      key: 'backgroundJobs',
      icon: Activity,
      status: health.services.backgroundJobs.status,
      meta: 'Cron + BullMQ',
      detail: 'Subscription reminders active',
    },
  ] : [];

  const platformStats = [
    {
      label: 'Total Companies',
      value: health?.companies.total,
      color: 'text-slate-900',
      hoverBg: 'hover:bg-blue-50',
      hoverText: 'hover:text-blue-600',
      path: '/super-admin/companies',
      desc: 'All registered companies',
    },
    {
      label: 'Active Subscriptions',
      value: health?.companies.active,
      color: 'text-green-600',
      hoverBg: 'hover:bg-green-50',
      hoverText: 'hover:text-green-700',
      path: '/super-admin/companies?plan=active',
      desc: 'Paid & active plans',
    },
    {
      label: 'On Trial',
      value: health?.companies.trial,
      color: 'text-purple-600',
      hoverBg: 'hover:bg-purple-50',
      hoverText: 'hover:text-purple-700',
      path: '/super-admin/companies?plan=trial',
      desc: '7-day free trial',
    },
  ];

  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString('en-IN') : '—';

  return (
    <SuperAdminLayout pendingCount={pendingCount || 0}>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">System Health</h1>
          <p className="text-slate-400 text-sm mt-0.5">Real-time platform status and resource usage</p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-xs text-slate-400">Updated: {lastUpdated}</p>
          <button onClick={() => refetch()} disabled={isFetching}
            className="flex items-center gap-2 text-sm font-medium px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-60 transition-colors shadow-sm">
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-400">Checking system health...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Overall Status Banner */}
          <div className={`rounded-xl border p-4 mb-6 flex items-center gap-3 ${
            health?.status === 'operational' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          }`}>
            <div className={`w-3 h-3 rounded-full flex-shrink-0 animate-pulse ${
              health?.status === 'operational' ? 'bg-green-500' : 'bg-red-500'
            }`} />
            <div className="flex-1">
              <p className={`text-sm font-bold ${health?.status === 'operational' ? 'text-green-800' : 'text-red-800'}`}>
                {health?.status === 'operational' ? 'All Systems Operational' : 'System Issues Detected'}
              </p>
              <p className={`text-xs mt-0.5 ${health?.status === 'operational' ? 'text-green-600' : 'text-red-600'}`}>
                Auto-refreshes every 30 seconds
              </p>
            </div>
            <p className="text-xs text-slate-400">Uptime: {health?.uptime.days}d {health?.uptime.hours}h {health?.uptime.minutes}m</p>
          </div>

          {/* Services Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
            {services.map((service) => {
              const s = getStatusColor(service.status);
              return (
                <div key={service.key} className={`bg-white rounded-xl border ${s.border} shadow-sm p-5`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 ${s.bg} rounded-lg flex items-center justify-center`}>
                        <service.icon className={`w-4 h-4 ${s.text}`} />
                      </div>
                      <p className="text-sm font-semibold text-slate-900">{service.name}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${s.dot} animate-pulse`} />
                      <span className={`text-xs font-semibold ${s.text}`}>{s.label}</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">{service.meta}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{service.detail}</p>
                </div>
              );
            })}
          </div>

          {/* Resource Stats */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">

            {/* Uptime */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-blue-600" />
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Uptime</p>
              </div>
              <p className="text-2xl font-bold text-slate-900">
                {health?.uptime.days}d {health?.uptime.hours}h
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {health?.uptime.minutes}m · {health?.uptime.totalSeconds?.toLocaleString('en-IN')}s
              </p>
            </div>

            {/* System Memory */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-3">
                <MemoryStick className="w-4 h-4 text-purple-600" />
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">System RAM</p>
              </div>
              <p className="text-2xl font-bold text-slate-900">{health?.memory.percentage}%</p>
              <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getMemoryColor(health?.memory.percentage || 0)}`}
                  style={{ width: `${health?.memory.percentage || 0}%` }}
                />
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {health?.memory.used} MB / {health?.memory.total} MB used
              </p>
            </div>

            {/* Node Heap */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-3">
                <HardDrive className="w-4 h-4 text-amber-600" />
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Node Heap</p>
              </div>
              <p className="text-2xl font-bold text-slate-900">{health?.memory.heapUsed} MB</p>
              <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getMemoryColor(
                    Math.round(((health?.memory.heapUsed || 0) / (health?.memory.heapTotal || 1)) * 100)
                  )}`}
                  style={{ width: `${Math.round(((health?.memory.heapUsed || 0) / (health?.memory.heapTotal || 1)) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-slate-400 mt-1">
                of {health?.memory.heapTotal} MB heap total
              </p>
            </div>

            {/* DB Connections */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-3">
                <Cpu className="w-4 h-4 text-green-600" />
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">DB Connections</p>
              </div>
              <p className="text-2xl font-bold text-slate-900">
                {health?.services.database.activeConnections}
              </p>
              <p className="text-xs text-slate-400 mt-1">Active PostgreSQL connections</p>
              <p className="text-xs text-green-600 mt-0.5 font-medium">
                {(health?.services.database.activeConnections || 0) < 10 ? 'Normal range' : 'High load'}
              </p>
            </div>
          </div>

          {/* Platform Stats -- Clickable */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-400" />
                <h3 className="text-sm font-semibold text-slate-900">Platform Stats</h3>
              </div>
              <p className="text-xs text-slate-400">Click to view filtered companies</p>
            </div>
            <div className="grid grid-cols-3 divide-x divide-slate-100">
              {platformStats.map((item) => (
                <button
                  key={item.label}
                  onClick={() => navigate(item.path)}
                  className={`p-6 text-center transition-colors w-full group ${item.hoverBg}`}
                >
                  <p className={`text-3xl font-bold transition-colors ${item.color} group-${item.hoverText}`}>
                    {item.value ?? '—'}
                  </p>
                  <p className="text-sm font-semibold text-slate-700 mt-1">{item.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                  <div className="flex items-center justify-center gap-1 mt-2 text-xs text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    View all <ChevronRight className="w-3 h-3" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </SuperAdminLayout>
  );
};

export default SuperAdminSystemHealth;