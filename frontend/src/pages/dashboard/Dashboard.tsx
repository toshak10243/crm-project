import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { CrmLayout } from '../../components/layout/CrmLayout';
import api from '../../lib/api';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const MasterDashboard: React.FC = () => {
  const navigate = useNavigate();

  // =========================================================================
  // 1. GLOBAL DASHBOARD FILTERS STATE
  // =========================================================================
  const [globalPreset, setGlobalPreset] = useState<'all' | 'today' | '7days' | '30days' | 'this_month' | 'custom'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [branch, setBranch] = useState('');
  const [manager, setManager] = useState('');
  const [status, setStatus] = useState('');
  const [source, setSource] = useState('');

  // =========================================================================
  // 2. PER-GRAPH DEDICATED IN-CARD FILTERS STATE
  // =========================================================================
  // Graph 1: Leads Inflow Velocity
  const [velocityDays, setVelocityDays] = useState<'7' | '14' | '30' | '90'>('7');
  const [velocityManager, setVelocityManager] = useState('');
  const [velocityStatus, setVelocityStatus] = useState('');

  // Graph 2: Lead Source Attribution
  const [sourceTimeframe, setSourceTimeframe] = useState('');
  const [sourceManager, setSourceManager] = useState('');

  // Graph 3: Pipeline Stage Conversion
  const [funnelTimeframe, setFunnelTimeframe] = useState('');
  const [funnelSource, setFunnelSource] = useState('');
  const [funnelManager, setFunnelManager] = useState('');

  // Section 4: Recent Leads & Team Allocation
  const [recentStatus, setRecentStatus] = useState('');
  const [recentSource, setRecentSource] = useState('');
  const [performersTimeframe, setPerformersTimeframe] = useState('');
  const [performersRole, setPerformersRole] = useState('');

  // =========================================================================
  // 3. FETCH DROPDOWN OPTIONS FROM BACKEND
  // =========================================================================
  const { data: optionsData } = useQuery({
    queryKey: ['lead-form-options'],
    queryFn: async () => {
      const res = await api.get('/leads/options');
      return res.data?.data;
    },
    staleTime: 60 * 1000,
  });

  const branchesList = optionsData?.branches || [];
  const managersList = optionsData?.counselors || [];
  const statusesList = optionsData?.statuses || [];
  const rawLeadSources = optionsData?.leadSources || [];

  // =========================================================================
  // 4. FETCH REAL-TIME DASHBOARD DATA (GLOBAL + PER-GRAPH OVERRIDES)
  // =========================================================================
  const { data: dashboardData, isLoading, refetch } = useQuery({
    queryKey: [
      'dashboard-metrics',
      startDate,
      endDate,
      branch,
      manager,
      status,
      source,
      velocityDays,
      velocityManager,
      velocityStatus,
      sourceTimeframe,
      sourceManager,
      funnelTimeframe,
      funnelSource,
      funnelManager,
      recentStatus,
      recentSource,
      performersTimeframe,
      performersRole,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (branch) params.append('branchId', branch);
      if (manager) params.append('managerId', manager);
      if (status) params.append('statusId', status);
      if (source) params.append('source', source);

      // Graph 1 overrides
      if (velocityDays) params.append('velocityDays', velocityDays);
      if (velocityManager) params.append('velocityManagerId', velocityManager);
      if (velocityStatus) params.append('velocityStatusId', velocityStatus);

      // Graph 2 overrides
      if (sourceTimeframe) params.append('sourceTimeframe', sourceTimeframe);
      if (sourceManager) params.append('sourceManagerId', sourceManager);

      // Graph 3 overrides
      if (funnelTimeframe) params.append('funnelTimeframe', funnelTimeframe);
      if (funnelSource) params.append('funnelSource', funnelSource);
      if (funnelManager) params.append('funnelManagerId', funnelManager);

      // Section 4 overrides
      if (recentStatus) params.append('recentStatusId', recentStatus);
      if (recentSource) params.append('recentSource', recentSource);
      if (performersTimeframe) params.append('performersTimeframe', performersTimeframe);
      if (performersRole) params.append('performersRole', performersRole);

      const res = await api.get(`/leads/dashboard-metrics?${params.toString()}`);
      return res.data?.data;
    },
    refetchInterval: 30 * 1000,
  });

  const metrics = dashboardData?.metrics || {
    totalLeads: 0,
    todayFollowup: 0,
    allFollowup: 0,
    todayBirthday: 0,
    totalBranches: 0,
    totalCounselors: 0,
  };

  const chartData = dashboardData?.chartData || [];
  const leadSourceData = dashboardData?.leadSourceData || [];
  const funnelData = dashboardData?.funnelData || [];
  const recentLeads = dashboardData?.recentLeads || [];
  const performers = dashboardData?.performers || [];

  // Available unique sources
  const allLeadSources = Array.from(
    new Set([
      ...rawLeadSources.map((s: any) => s.name),
      ...leadSourceData.map((s: any) => s.name),
      'Website',
      'Google Ads',
      'Facebook / Meta Ads',
      'Direct',
      'Referral',
      'IndiaMART',
      'WhatsApp',
    ].filter(Boolean))
  );

  // =========================================================================
  // 5. PRESET TIMELINE HANDLER
  // =========================================================================
  const handlePresetChange = (preset: 'all' | 'today' | '7days' | '30days' | 'this_month' | 'custom') => {
    setGlobalPreset(preset);
    const now = new Date();
    const fmt = (d: Date) => d.toISOString().split('T')[0];

    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'today') {
      const t = fmt(now);
      setStartDate(t);
      setEndDate(t);
    } else if (preset === '7days') {
      const d = new Date();
      d.setDate(d.getDate() - 6);
      setStartDate(fmt(d));
      setEndDate(fmt(now));
    } else if (preset === '30days') {
      const d = new Date();
      d.setDate(d.getDate() - 29);
      setStartDate(fmt(d));
      setEndDate(fmt(now));
    } else if (preset === 'this_month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(fmt(startOfMonth));
      setEndDate(fmt(now));
    }
  };

  // Reset all filters (global + per-graph)
  const handleResetFilter = () => {
    setGlobalPreset('all');
    setStartDate('');
    setEndDate('');
    setBranch('');
    setManager('');
    setStatus('');
    setSource('');
    setVelocityDays('7');
    setVelocityManager('');
    setVelocityStatus('');
    setSourceTimeframe('');
    setSourceManager('');
    setFunnelTimeframe('');
    setFunnelSource('');
    setFunnelManager('');
    setRecentStatus('');
    setRecentSource('');
    setPerformersTimeframe('');
    setPerformersRole('');
    refetch();
  };

  // Count active filters for badge
  const activeFiltersCount = [
    startDate,
    endDate,
    branch,
    manager,
    status,
    source,
    velocityManager,
    velocityStatus,
    sourceTimeframe,
    sourceManager,
    funnelTimeframe,
    funnelSource,
    funnelManager,
    recentStatus,
    recentSource,
    performersTimeframe,
    performersRole,
  ].filter(Boolean).length;

  return (
    <CrmLayout>
      <div className="space-y-6 max-w-7xl pb-16">
        {/* ========================================================= */}
        {/* TOP WELCOME & FAST ACTION ROW                             */}
        {/* ========================================================= */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Master Dashboard</h1>
              {activeFiltersCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-[#003884] border border-blue-200">
                  {activeFiltersCount} Filters Active
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Real-time enterprise metrics, multi-graph filtering, and sales pipeline analytics
            </p>
          </div>

          {/* Quick Action Navigation */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => navigate('/crm/add-lead')}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-[#003884] hover:bg-[#002860] active:scale-98 transition rounded-xl shadow-xs cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              <span>Add New Lead</span>
            </button>

            <button
              onClick={() => navigate('/work-report')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition rounded-xl cursor-pointer"
            >
              <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Work Report</span>
            </button>

            <button
              onClick={() => navigate('/crm/all-leads')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition rounded-xl cursor-pointer"
            >
              <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              <span>All Leads</span>
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* SECTION 1: TOP 6 METRICS CARDS (3x2 COLORFUL GRID)         */}
        {/* ========================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* 1. Total Leads */}
          <div
            onClick={() => navigate('/crm/all-leads')}
            className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50/70 to-blue-100/60 border border-blue-200/90 rounded-2xl p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/15 hover:border-blue-400 cursor-pointer shadow-sm group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-900/80">Total Leads</span>
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/25 group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">
                {isLoading ? '...' : Number(metrics.totalLeads).toLocaleString()}
              </h3>
              <div className="mt-2.5">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/15 text-blue-800 border border-blue-200/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                  Active database
                </span>
              </div>
            </div>
          </div>

          {/* 2. Today's Followup */}
          <div
            onClick={() => navigate('/crm/today-followup')}
            className="relative overflow-hidden bg-gradient-to-br from-amber-50 via-orange-50/70 to-amber-100/60 border border-amber-200/90 rounded-2xl p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-amber-500/15 hover:border-amber-400 cursor-pointer shadow-sm group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-900/80">Today Followups</span>
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-md shadow-amber-500/25 group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">
                {isLoading ? '...' : metrics.todayFollowup}
              </h3>
              <div className="mt-2.5">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-800 border border-amber-200/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  Due today
                </span>
              </div>
            </div>
          </div>

          {/* 3. All Followups */}
          <div
            onClick={() => navigate('/crm/all-followup')}
            className="relative overflow-hidden bg-gradient-to-br from-purple-50 via-violet-50/70 to-purple-100/60 border border-purple-200/90 rounded-2xl p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-purple-500/15 hover:border-purple-400 cursor-pointer shadow-sm group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-900/80">All Followups</span>
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-600 to-violet-600 text-white flex items-center justify-center shadow-md shadow-purple-500/25 group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">
                {isLoading ? '...' : metrics.allFollowup}
              </h3>
              <div className="mt-2.5">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/15 text-purple-800 border border-purple-200/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-600"></span>
                  Scheduled tasks
                </span>
              </div>
            </div>
          </div>

          {/* 4. Total Branches */}
          <div
            onClick={() => navigate('/master/branch')}
            className="relative overflow-hidden bg-gradient-to-br from-cyan-50 via-sky-50/70 to-cyan-100/60 border border-cyan-200/90 rounded-2xl p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-cyan-500/15 hover:border-cyan-400 cursor-pointer shadow-sm group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-900/80">Branches</span>
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-600 to-teal-600 text-white flex items-center justify-center shadow-md shadow-cyan-500/25 group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">
                {isLoading ? '...' : metrics.totalBranches}
              </h3>
              <div className="mt-2.5">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-cyan-500/15 text-cyan-800 border border-cyan-200/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-600"></span>
                  Enterprise units
                </span>
              </div>
            </div>
          </div>

          {/* 5. Total Counselors */}
          <div
            onClick={() => navigate('/admin-users')}
            className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-teal-50/70 to-emerald-100/60 border border-emerald-200/90 rounded-2xl p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-500/15 hover:border-emerald-400 cursor-pointer shadow-sm group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-900/80">Team / Reps</span>
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/25 group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">
                {isLoading ? '...' : metrics.totalCounselors}
              </h3>
              <div className="mt-2.5">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-800 border border-emerald-200/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                  Active counselors
                </span>
              </div>
            </div>
          </div>

          {/* 6. Today's Birthdays */}
          <div
            onClick={() => navigate('/crm/today-birthday')}
            className="relative overflow-hidden bg-gradient-to-br from-rose-50 via-pink-50/70 to-rose-100/60 border border-rose-200/90 rounded-2xl p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-rose-500/15 hover:border-rose-400 cursor-pointer shadow-sm group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-900/80">Birthdays</span>
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 text-white flex items-center justify-center shadow-md shadow-rose-500/25 group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.701 2.701 0 00-1.5-.454M9 6v2m3-2v2m3-2v2M9 3h.01M12 3h.01M15 3h.01M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                </svg>
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">
                {isLoading ? '...' : metrics.todayBirthday}
              </h3>
              <div className="mt-2.5">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-800 border border-rose-200/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                  {metrics.todayBirthday > 0 ? 'Wishes pending' : 'No birthdays today'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* SECTION 2: GLOBAL MASTER DASHBOARD FILTERS BAR            */}
        {/* ========================================================= */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#003884] flex items-center justify-center border border-blue-100">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Dashboard Intelligence Filters</h2>
                <p className="text-[11px] text-slate-500">Universal filter criteria across all graphs, velocity & pipelines</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={handleResetFilter}
                  className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs border border-rose-200 transition-colors cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Reset All Filters
                </button>
              )}
            </div>
          </div>

          {/* Quick Date Presets Row */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1">Timeframe:</span>
            {[
              { id: 'all', label: 'All Time' },
              { id: 'today', label: 'Today' },
              { id: '7days', label: 'Last 7 Days' },
              { id: '30days', label: 'Last 30 Days' },
              { id: 'this_month', label: 'This Month' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handlePresetChange(p.id as any)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  globalPreset === p.id && (!startDate || p.id !== 'all')
                    ? 'bg-[#003884] text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/60'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* 6-Column Filter Controls Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-1">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">From Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setGlobalPreset('custom');
                }}
                className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 text-slate-800 bg-slate-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#003884]/20 focus:border-[#003884]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">To Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setGlobalPreset('custom');
                }}
                className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 text-slate-800 bg-slate-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#003884]/20 focus:border-[#003884]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Branch</label>
              <select
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 text-slate-800 bg-slate-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#003884]/20 focus:border-[#003884]"
              >
                <option value="">All Branches</option>
                {branchesList.map((b: any) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.city || 'HQ'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Representative</label>
              <select
                value={manager}
                onChange={(e) => setManager(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 text-slate-800 bg-slate-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#003884]/20 focus:border-[#003884]"
              >
                <option value="">All Counselors</option>
                {managersList.map((m: any) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Pipeline Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 text-slate-800 bg-slate-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#003884]/20 focus:border-[#003884]"
              >
                <option value="">All Statuses</option>
                {statusesList.map((st: any) => (
                  <option key={st.id} value={st.id}>
                    {st.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Lead Source</label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 text-slate-800 bg-slate-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#003884]/20 focus:border-[#003884]"
              >
                <option value="">All Sources</option>
                {allLeadSources.map((sName: string, idx: number) => (
                  <option key={idx} value={sName}>
                    {sName}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* GRAPH 1: LEADS INFLOW VELOCITY WITH IN-CARD FILTERS       */}
        {/* ========================================================= */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 tracking-tight">Leads Inflow Velocity</h2>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-[#003884] border border-blue-200">
                  {chartData.reduce((acc: number, c: any) => acc + (c.leads || 0), 0)} Leads in Range
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Daily incoming lead volume pattern across selected timeline</p>
            </div>

            {/* In-Card Quick Filters for Graph 1 */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Timeline Preset Selector */}
              <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
                {(['7', '14', '30', '90'] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setVelocityDays(d)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      velocityDays === d
                        ? 'bg-white text-[#003884] shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {d}D
                  </button>
                ))}
              </div>

              {/* Counselor Filter */}
              <select
                value={velocityManager}
                onChange={(e) => setVelocityManager(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 text-slate-700 bg-slate-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#003884]/20"
              >
                <option value="">All Counselors</option>
                {managersList.map((m: any) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={velocityStatus}
                onChange={(e) => setVelocityStatus(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 text-slate-700 bg-slate-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#003884]/20"
              >
                <option value="">All Statuses</option>
                {statusesList.map((st: any) => (
                  <option key={st.id} value={st.id}>
                    {st.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Area Chart with Real Data */}
          <div className="h-64 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="leadGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#003884" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#003884" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e2e8f0',
                    borderRadius: '8px',
                    fontSize: '12px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Area type="monotone" dataKey="leads" stroke="#003884" strokeWidth={2.5} fillOpacity={1} fill="url(#leadGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ========================================================= */}
        {/* SECTION 3: LEAD SOURCE BREAKDOWN & PIPELINE STAGE FUNNEL  */}
        {/* ========================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* GRAPH 2: Lead Sources Donut Chart WITH IN-CARD FILTERS */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Lead Source Attribution</h3>
                  <p className="text-[11px] text-slate-400">Incoming origin channels</p>
                </div>

                {/* In-Card Quick Filters for Graph 2 */}
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={sourceTimeframe}
                    onChange={(e) => setSourceTimeframe(e.target.value)}
                    className="px-2 py-1 text-xs rounded-lg border border-slate-300 text-slate-700 bg-slate-50 hover:bg-white focus:bg-white focus:outline-none"
                  >
                    <option value="">All Time</option>
                    <option value="today">Today</option>
                    <option value="7days">Last 7 Days</option>
                    <option value="30days">Last 30 Days</option>
                    <option value="this_month">This Month</option>
                  </select>

                  <select
                    value={sourceManager}
                    onChange={(e) => setSourceManager(e.target.value)}
                    className="px-2 py-1 text-xs rounded-lg border border-slate-300 text-slate-700 bg-slate-50 hover:bg-white focus:bg-white focus:outline-none"
                  >
                    <option value="">All Counselors</option>
                    {managersList.map((m: any) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>

                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                    {leadSourceData.length} Channels
                  </span>
                </div>
              </div>

              <div className="h-56 w-full flex items-center justify-center">
                {leadSourceData.length > 0 && leadSourceData.some((d: any) => d.value > 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={leadSourceData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {leadSourceData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-xs text-slate-400 font-medium">No lead source records found</div>
                )}
              </div>
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100">
              {leadSourceData.map((s: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2 truncate">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="text-slate-700 font-medium truncate">{s.name}</span>
                  </div>
                  <span className="font-bold text-slate-900">{s.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* GRAPH 3: Sales Pipeline Funnel WITH IN-CARD FILTERS */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Pipeline Stage Conversion</h3>
                  <p className="text-[11px] text-slate-400">Current active leads across stages</p>
                </div>

                {/* In-Card Quick Filters for Graph 3 */}
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={funnelTimeframe}
                    onChange={(e) => setFunnelTimeframe(e.target.value)}
                    className="px-2 py-1 text-xs rounded-lg border border-slate-300 text-slate-700 bg-slate-50 hover:bg-white focus:bg-white focus:outline-none"
                  >
                    <option value="">All Time</option>
                    <option value="today">Today</option>
                    <option value="7days">Last 7 Days</option>
                    <option value="30days">Last 30 Days</option>
                    <option value="this_month">This Month</option>
                  </select>

                  <select
                    value={funnelSource}
                    onChange={(e) => setFunnelSource(e.target.value)}
                    className="px-2 py-1 text-xs rounded-lg border border-slate-300 text-slate-700 bg-slate-50 hover:bg-white focus:bg-white focus:outline-none"
                  >
                    <option value="">All Sources</option>
                    {allLeadSources.map((sName: string, idx: number) => (
                      <option key={idx} value={sName}>
                        {sName}
                      </option>
                    ))}
                  </select>

                  <select
                    value={funnelManager}
                    onChange={(e) => setFunnelManager(e.target.value)}
                    className="px-2 py-1 text-xs rounded-lg border border-slate-300 text-slate-700 bg-slate-50 hover:bg-white focus:bg-white focus:outline-none"
                  >
                    <option value="">All Counselors</option>
                    {managersList.map((m: any) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="h-56 w-full pt-2">
                {funnelData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={funnelData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="stage" stroke="#94a3b8" fontSize={11} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          borderColor: '#e2e8f0',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                      />
                      <Bar dataKey="count" fill="#003884" radius={[6, 6, 0, 0]}>
                        {funnelData.map((entry: any, index: number) => (
                          <Cell key={`bar-${index}`} fill={entry.color || '#003884'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    No pipeline status data
                  </div>
                )}
              </div>
            </div>

            {/* Quick summary strip */}
            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <span className="text-slate-600 font-medium">Pipeline Stages:</span>
                <span className="font-bold text-slate-900">{funnelData.length}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <span className="text-slate-600 font-medium">Total Stage Leads:</span>
                <span className="font-bold text-[#003884]">
                  {funnelData.reduce((acc: number, f: any) => acc + (f.count || 0), 0)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* SECTION 4: RECENT LEADS & TOP PERFORMERS                  */}
        {/* ========================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Leads WITH IN-CARD FILTERS */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Recent Customer Inquiries</h3>
                <p className="text-[11px] text-slate-400">Latest logged records in pipeline</p>
              </div>

              {/* In-Card Quick Filters for Recent Leads */}
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={recentStatus}
                  onChange={(e) => setRecentStatus(e.target.value)}
                  className="px-2 py-1 text-xs rounded-lg border border-slate-300 text-slate-700 bg-slate-50 hover:bg-white focus:bg-white focus:outline-none"
                >
                  <option value="">All Statuses</option>
                  {statusesList.map((st: any) => (
                    <option key={st.id} value={st.id}>
                      {st.name}
                    </option>
                  ))}
                </select>

                <select
                  value={recentSource}
                  onChange={(e) => setRecentSource(e.target.value)}
                  className="px-2 py-1 text-xs rounded-lg border border-slate-300 text-slate-700 bg-slate-50 hover:bg-white focus:bg-white focus:outline-none"
                >
                  <option value="">All Sources</option>
                  {allLeadSources.map((sName: string, idx: number) => (
                    <option key={idx} value={sName}>
                      {sName}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => navigate('/crm/all-leads')}
                  className="text-xs text-[#003884] hover:text-blue-700 font-bold hover:underline cursor-pointer ml-1"
                >
                  View All →
                </button>
              </div>
            </div>

            <div className="space-y-2.5">
              {recentLeads.length > 0 ? (
                recentLeads.map((l: any) => (
                  <div
                    key={l.id}
                    onClick={() => navigate(`/crm/view-lead/${l.id}`)}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-blue-50/50 border border-slate-100 transition-colors cursor-pointer text-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-900">
                        {l.name}{' '}
                        {l.city && <span className="font-normal text-slate-400 text-[11px]">({l.city})</span>}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {l.phone || 'No Phone'} • <span className="text-slate-600 font-medium">{l.lead_from || 'Direct'}</span>
                      </div>
                    </div>
                    <span
                      className="px-2.5 py-1 rounded text-[10px] font-bold text-white shadow-2xs uppercase tracking-wide"
                      style={{ backgroundColor: l.status_color || '#3b82f6' }}
                    >
                      {l.status_name || 'NEW'}
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">No leads found in database matching filter</div>
              )}
            </div>
          </div>

          {/* Top Sales Team Performers WITH IN-CARD FILTERS */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Team Work Allocation</h3>
                <p className="text-[11px] text-slate-400">Representatives & lead handling ratio</p>
              </div>

              {/* In-Card Quick Filters for Team Allocation */}
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={performersTimeframe}
                  onChange={(e) => setPerformersTimeframe(e.target.value)}
                  className="px-2 py-1 text-xs rounded-lg border border-slate-300 text-slate-700 bg-slate-50 hover:bg-white focus:bg-white focus:outline-none"
                >
                  <option value="">All Time</option>
                  <option value="today">Today</option>
                  <option value="7days">Last 7 Days</option>
                  <option value="30days">Last 30 Days</option>
                  <option value="this_month">This Month</option>
                </select>

                <select
                  value={performersRole}
                  onChange={(e) => setPerformersRole(e.target.value)}
                  className="px-2 py-1 text-xs rounded-lg border border-slate-300 text-slate-700 bg-slate-50 hover:bg-white focus:bg-white focus:outline-none"
                >
                  <option value="">All Roles</option>
                  <option value="manager">Manager</option>
                  <option value="sales_executive">Sales Executive</option>
                  <option value="counselor">Counselor</option>
                  <option value="admin">Admin</option>
                </select>

                <button
                  onClick={() => navigate('/admin-users')}
                  className="text-xs text-[#003884] hover:text-blue-700 font-bold hover:underline cursor-pointer ml-1"
                >
                  Manage Team →
                </button>
              </div>
            </div>

            <div className="space-y-2.5">
              {performers.length > 0 ? (
                performers.map((rep: any, idx: number) => (
                  <div
                    key={rep.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#003884] font-black flex items-center justify-center text-xs border border-blue-100">
                        #{idx + 1}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">{rep.name}</div>
                        <div className="text-[11px] text-slate-400 capitalize">{rep.role}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="inline-block px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-[11px]">
                        {rep.leads_handled !== undefined ? rep.leads_handled : rep.leads} leads handled
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">No team activity found</div>
              )}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="pt-2 text-center text-xs text-slate-400">
          DigiInk CRM Enterprise &bull; Production Analytics &bull; Real-time Database Synced
        </div>
      </div>
    </CrmLayout>
  );
};

export default MasterDashboard;
