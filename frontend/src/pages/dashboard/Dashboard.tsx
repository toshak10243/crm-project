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

  // Filter state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [manager, setManager] = useState('');
  const [status, setStatus] = useState('');

  // 1. Fetch Form Dropdown Options (Managers & Statuses for filters)
  const { data: optionsData } = useQuery({
    queryKey: ['lead-form-options'],
    queryFn: async () => {
      const res = await api.get('/leads/options');
      return res.data?.data;
    },
    staleTime: 60 * 1000,
  });

  const managersList = optionsData?.counselors || [];
  const statusesList = optionsData?.statuses || [];

  // 2. Fetch Real-time Dashboard Metrics from DB
  const { data: dashboardData, isLoading, refetch } = useQuery({
    queryKey: ['dashboard-metrics', startDate, endDate, manager, status],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (manager) params.append('managerId', manager);
      if (status) params.append('statusId', status);

      const res = await api.get(`/leads/dashboard-metrics?${params.toString()}`);
      return res.data?.data;
    },
    refetchInterval: 30 * 1000, // Poll every 30 seconds for live updates
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

  const handleResetFilter = () => {
    setStartDate('');
    setEndDate('');
    setManager('');
    setStatus('');
    refetch();
  };

  return (
    <CrmLayout>
      <div className="space-y-6 max-w-7xl pb-16">
        {/* Top Header & Fast Action Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Master Dashboard</h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Real-time enterprise metrics, sales pipeline analysis, and lead velocity
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
        {/* SECTION 1: TOP 6 METRICS CARDS (FULL WIDTH GRID)          */}
        {/* ========================================================= */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* 1. Total Leads */}
          <div
            onClick={() => navigate('/crm/all-leads')}
            className="bg-white border border-slate-200 rounded-2xl p-4 transition-all hover:shadow-md hover:border-blue-300 cursor-pointer shadow-2xs group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Leads</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-[#003884] group-hover:text-white transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-black text-slate-900">
                {isLoading ? '...' : Number(metrics.totalLeads).toLocaleString()}
              </h3>
              <p className="text-[10px] text-blue-600 font-semibold mt-0.5">Active database</p>
            </div>
          </div>

          {/* 2. Today's Followup */}
          <div
            onClick={() => navigate('/crm/today-followup')}
            className="bg-white border border-slate-200 rounded-2xl p-4 transition-all hover:shadow-md hover:border-amber-300 cursor-pointer shadow-2xs group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Today Followups</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-black text-slate-900">
                {isLoading ? '...' : metrics.todayFollowup}
              </h3>
              <p className="text-[10px] text-amber-600 font-semibold mt-0.5">Due today</p>
            </div>
          </div>

          {/* 3. All Followups */}
          <div
            onClick={() => navigate('/crm/all-followup')}
            className="bg-white border border-slate-200 rounded-2xl p-4 transition-all hover:shadow-md hover:border-indigo-300 cursor-pointer shadow-2xs group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">All Followups</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-black text-slate-900">
                {isLoading ? '...' : metrics.allFollowup}
              </h3>
              <p className="text-[10px] text-indigo-600 font-semibold mt-0.5">Scheduled tasks</p>
            </div>
          </div>

          {/* 4. Total Branches */}
          <div
            onClick={() => navigate('/master/branch')}
            className="bg-white border border-slate-200 rounded-2xl p-4 transition-all hover:shadow-md hover:border-sky-300 cursor-pointer shadow-2xs group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Branches</span>
              <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center group-hover:bg-sky-600 group-hover:text-white transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-black text-slate-900">
                {isLoading ? '...' : metrics.totalBranches}
              </h3>
              <p className="text-[10px] text-sky-600 font-semibold mt-0.5">Enterprise units</p>
            </div>
          </div>

          {/* 5. Total Counselors */}
          <div
            onClick={() => navigate('/admin-users')}
            className="bg-white border border-slate-200 rounded-2xl p-4 transition-all hover:shadow-md hover:border-emerald-300 cursor-pointer shadow-2xs group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Team / Reps</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-black text-slate-900">
                {isLoading ? '...' : metrics.totalCounselors}
              </h3>
              <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">Active counselors</p>
            </div>
          </div>

          {/* 6. Today's Birthdays */}
          <div
            onClick={() => navigate('/crm/today-birthday')}
            className="bg-white border border-slate-200 rounded-2xl p-4 transition-all hover:shadow-md hover:border-purple-300 cursor-pointer shadow-2xs group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Birthdays</span>
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.701 2.701 0 00-1.5-.454M9 6v2m3-2v2m3-2v2M9 3h.01M12 3h.01M15 3h.01M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                </svg>
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-black text-slate-900">
                {isLoading ? '...' : metrics.todayBirthday}
              </h3>
              <p className="text-[10px] text-purple-600 font-semibold mt-0.5">
                {metrics.todayBirthday > 0 ? 'Wishes pending' : 'No birthdays today'}
              </p>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* SECTION 2: LEADS INFLOW VELOCITY & FILTERS               */}
        {/* ========================================================= */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Leads Inflow Velocity</h2>
              <p className="text-xs text-slate-500">Daily incoming lead volume pattern across selected timeline</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-3 py-1 rounded-lg bg-blue-50 text-[#003884] border border-blue-200">
                Total Leads: {metrics.totalLeads}
              </span>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 items-end">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 text-slate-800 bg-slate-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#003884]/20 focus:border-[#003884]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 text-slate-800 bg-slate-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#003884]/20 focus:border-[#003884]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Manager / Representative</label>
              <select
                value={manager}
                onChange={(e) => setManager(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 text-slate-800 bg-slate-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#003884]/20 focus:border-[#003884]"
              >
                <option value="">All Representatives</option>
                {managersList.map((m: any) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.role})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Pipeline Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 text-slate-800 bg-slate-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#003884]/20 focus:border-[#003884]"
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
              <button
                type="button"
                onClick={handleResetFilter}
                className="w-full py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer border border-slate-200"
              >
                Reset Filters
              </button>
            </div>
          </div>

          {/* Area Chart with Real Data */}
          <div className="h-64 w-full pt-2">
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
          {/* Lead Sources Donut Chart */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Lead Source Attribution</h3>
                  <p className="text-[11px] text-slate-400">Incoming origin channels</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                  {leadSourceData.length} Channels
                </span>
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

          {/* Sales Pipeline Funnel (Bar Chart from real DB lead_statuses) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Pipeline Stage Conversion</h3>
                  <p className="text-[11px] text-slate-400">Current active leads across stages</p>
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
                <span className="text-slate-600 font-medium">Stage Leads:</span>
                <span className="font-bold text-[#003884]">{metrics.totalLeads}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* SECTION 4: RECENT LEADS & TOP PERFORMERS                  */}
        {/* ========================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Leads */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Recent Customer Inquiries</h3>
                <p className="text-[11px] text-slate-400">Latest logged records in pipeline</p>
              </div>
              <button
                onClick={() => navigate('/crm/all-leads')}
                className="text-xs text-[#003884] hover:text-blue-700 font-bold hover:underline cursor-pointer"
              >
                View All Leads →
              </button>
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
                <div className="py-8 text-center text-xs text-slate-400">No leads found in database</div>
              )}
            </div>
          </div>

          {/* Top Sales Team Performers */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Team Work Allocation</h3>
                <p className="text-[11px] text-slate-400">Representatives & lead handling ratio</p>
              </div>
              <button
                onClick={() => navigate('/admin-users')}
                className="text-xs text-[#003884] hover:text-blue-700 font-bold hover:underline cursor-pointer"
              >
                Manage Team →
              </button>
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
          DigiInk CRM Enterprise &bull; Production Workspace &bull; All data synced
        </div>
      </div>
    </CrmLayout>
  );
};

export default MasterDashboard;
