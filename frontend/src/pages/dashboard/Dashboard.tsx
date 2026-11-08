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

  // Dialpad state
  const [dialedNumber, setDialedNumber] = useState('');
  const [callStatus, setCallStatus] = useState<string | null>(null);

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
    totalCalls: 0,
    incomingCalls: 0,
    outgoingCalls: 0,
    totalDurationSeconds: 0,
  };

  const chartData = dashboardData?.chartData || [];
  const leadSourceData = dashboardData?.leadSourceData || [];
  const funnelData = dashboardData?.funnelData || [];
  const recentLeads = dashboardData?.recentLeads || [];
  const performers = dashboardData?.performers || [];

  const handleDial = (num: string) => {
    if (dialedNumber.length < 15) {
      setDialedNumber((prev) => prev + num);
    }
  };

  const handleBackspace = () => {
    setDialedNumber((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setDialedNumber('');
    setCallStatus(null);
  };

  const handleCall = () => {
    if (!dialedNumber) return;
    setCallStatus('Connecting via Cloud IVR...');
    setTimeout(() => {
      setCallStatus('Ringing (+91 ' + dialedNumber + ')...');
    }, 1200);
  };

  const handleResetFilter = () => {
    setStartDate('');
    setEndDate('');
    setManager('');
    setStatus('');
    refetch();
  };

  // Format Duration string
  const formatDuration = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <CrmLayout>
      <div className="space-y-8 max-w-7xl pb-16">
        {/* Top Section: 4 Metric Cards + Enhanced Telephony Dialpad */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: 4 Metric Cards (100% Dynamic from Database) */}
          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* 1. Total Lead */}
            <div
              onClick={() => navigate('/crm/all-leads')}
              className="bg-[#fef3c7]/60 border border-amber-200/80 rounded-2xl p-6 flex items-center gap-5 transition-all hover:shadow-md cursor-pointer"
            >
              <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Leads</p>
                <h3 className="text-3xl font-extrabold text-slate-900 mt-1">
                  {isLoading ? '...' : Number(metrics.totalLeads).toLocaleString()}
                </h3>
                <p className="text-[11px] text-amber-700/80 font-medium mt-0.5">
                  {metrics.allFollowup} followups scheduled
                </p>
              </div>
            </div>

            {/* 2. Total Branch */}
            <div
              onClick={() => navigate('/master/branch')}
              className="bg-[#e0f2fe]/60 border border-sky-200/80 rounded-2xl p-6 flex items-center gap-5 transition-all hover:shadow-md cursor-pointer"
            >
              <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Branches</p>
                <h3 className="text-3xl font-extrabold text-slate-900 mt-1">
                  {isLoading ? '...' : metrics.totalBranches}
                </h3>
                <p className="text-[11px] text-sky-700/80 font-medium mt-0.5">Active enterprise locations</p>
              </div>
            </div>

            {/* 3. Total Counselors / Sales Agents */}
            <div
              onClick={() => navigate('/admin-users')}
              className="bg-[#dcfce7]/60 border border-emerald-200/80 rounded-2xl p-6 flex items-center gap-5 transition-all hover:shadow-md cursor-pointer"
            >
              <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Counsellors</p>
                <h3 className="text-3xl font-extrabold text-slate-900 mt-1">
                  {isLoading ? '...' : metrics.totalCounselors}
                </h3>
                <p className="text-[11px] text-emerald-700/80 font-medium mt-0.5">Team members active</p>
              </div>
            </div>

            {/* 4. Today's Birthdays */}
            <div
              onClick={() => navigate('/crm/today-birthday')}
              className="bg-[#f3e8ff]/60 border border-purple-200/80 rounded-2xl p-6 flex items-center gap-5 transition-all hover:shadow-md cursor-pointer"
            >
              <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.701 2.701 0 00-1.5-.454M9 6v2m3-2v2m3-2v2M9 3h.01M12 3h.01M15 3h.01M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Today's Birthdays</p>
                <h3 className="text-3xl font-extrabold text-slate-900 mt-1">
                  {isLoading ? '...' : metrics.todayBirthday}
                </h3>
                <p className="text-[11px] text-purple-700/80 font-medium mt-0.5">
                  {metrics.todayBirthday > 0 ? 'Wishes pending' : 'No birthdays today'}
                </p>
              </div>
            </div>
          </div>

          {/* Right: Cloud IVR Telephony Dialpad */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Cloud IVR Telephony</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-600 font-semibold border border-blue-100">
                {metrics.totalCalls} Calls Logged
              </span>
            </div>

            {/* Dialed Display */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-4 text-center">
              <div className="text-lg font-bold font-mono tracking-wider text-slate-800 min-h-[28px] flex items-center justify-center">
                {dialedNumber || <span className="text-slate-300 text-sm font-sans">Enter phone number...</span>}
              </div>
              {callStatus && (
                <div className="text-[11px] font-semibold text-emerald-600 mt-1 animate-pulse">
                  {callStatus}
                </div>
              )}
            </div>

            {/* Dialpad Buttons 0-9, *, # */}
            <div className="grid grid-cols-3 gap-2.5 mb-4">
              {[
                { n: '1', sub: '' },
                { n: '2', sub: 'ABC' },
                { n: '3', sub: 'DEF' },
                { n: '4', sub: 'GHI' },
                { n: '5', sub: 'JKL' },
                { n: '6', sub: 'MNO' },
                { n: '7', sub: 'PQRS' },
                { n: '8', sub: 'TUV' },
                { n: '9', sub: 'WXYZ' },
                { n: '*', sub: '' },
                { n: '0', sub: '+' },
                { n: '#', sub: '' },
              ].map((btn) => (
                <button
                  key={btn.n}
                  onClick={() => handleDial(btn.n)}
                  className="h-11 rounded-lg bg-slate-50 hover:bg-blue-50 hover:border-blue-300 border border-slate-200 text-slate-700 font-semibold flex flex-col items-center justify-center transition-all cursor-pointer active:scale-95"
                >
                  <span className="text-sm leading-none">{btn.n}</span>
                  {btn.sub && <span className="text-[8px] text-slate-400 leading-none mt-0.5">{btn.sub}</span>}
                </button>
              ))}
            </div>

            {/* Action Buttons: Clear, Dial, Backspace */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={handleClear}
                className="py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs transition-colors cursor-pointer"
              >
                Clear
              </button>
              <button
                onClick={handleCall}
                className="py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                Call
              </button>
              <button
                onClick={handleBackspace}
                className="py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs flex items-center justify-center transition-colors cursor-pointer"
              >
                ⌫
              </button>
            </div>
          </div>
        </div>

        {/* Section 2: Leads By Date Chart + Dynamic Filters */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Leads Inflow Velocity</h2>
              <p className="text-xs text-slate-500">Real-time incoming lead counts across selected timeline</p>
            </div>
            <div className="text-xs font-semibold px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
              Filtered Total: {metrics.totalLeads} leads
            </div>
          </div>

          {/* Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Manager / Counselor</label>
              <select
                value={manager}
                onChange={(e) => setManager(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-600"
              >
                <option value="">All Managers</option>
                {managersList.map((m: any) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.role})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-600"
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
                className="w-full py-2 px-4 rounded-lg bg-[#003884] hover:bg-blue-900 text-white font-semibold text-xs transition-colors cursor-pointer shadow-xs"
              >
                Reset Filter
              </button>
            </div>
          </div>

          {/* Area Chart with Real Data */}
          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="leadGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
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
                <Area type="monotone" dataKey="leads" stroke="#2563eb" strokeWidth={2.5} fillOpacity={1} fill="url(#leadGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Section 3: Lead Sources Distribution (Donut) & Live Funnel (Bar) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Lead Sources Donut Chart */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Lead Source Channel Breakdown</h3>
                <p className="text-[11px] text-slate-400">Captured lead origin attribution</p>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100">
                Live Channels
              </span>
            </div>

            <div className="h-60 w-full flex items-center justify-center">
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

            {/* Legend */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
              {leadSourceData.map((s: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50">
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
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Pipeline Stage Conversion</h3>
                <p className="text-[11px] text-slate-400">Current lead counts mapped across statuses</p>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-100">
                Database Pipeline
              </span>
            </div>

            <div className="h-60 w-full">
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
                    <Bar dataKey="count" fill="#2563eb" radius={[6, 6, 0, 0]}>
                      {funnelData.map((entry: any, index: number) => (
                        <Cell key={`bar-${index}`} fill={entry.color || '#2563eb'} />
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

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600">
              <span>Cloud Telephony Duration Logged:</span>
              <span className="font-bold text-emerald-600 text-sm">
                {formatDuration(metrics.totalDurationSeconds)}
              </span>
            </div>
          </div>
        </div>

        {/* Section 4: Recent Leads & Top Sales Reps (Direct from Database) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Leads */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Recent Leads</h3>
              <span
                onClick={() => navigate('/crm/all-leads')}
                className="text-xs text-blue-600 font-semibold cursor-pointer hover:underline"
              >
                View All Leads →
              </span>
            </div>
            <div className="space-y-3">
              {recentLeads.length > 0 ? (
                recentLeads.map((l: any) => (
                  <div
                    key={l.id}
                    onClick={() => navigate(`/crm/view-lead/${l.id}`)}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 hover:bg-blue-50/40 border border-slate-100 transition-colors cursor-pointer text-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-800">
                        {l.name}{' '}
                        {l.city && <span className="font-normal text-slate-400">({l.city})</span>}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {l.phone} • {l.lead_from || 'Direct'}
                      </div>
                    </div>
                    <span
                      className="px-2.5 py-1 rounded text-[10px] font-semibold border"
                      style={{
                        backgroundColor: `${l.status_color || '#2563eb'}15`,
                        color: l.status_color || '#2563eb',
                        borderColor: `${l.status_color || '#2563eb'}40`,
                      }}
                    >
                      {l.status_name || 'NEW'}
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-slate-400">No leads found in database</div>
              )}
            </div>
          </div>

          {/* Top Sales Team Performers */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Sales Team Activity</h3>
              <span className="text-xs text-slate-400">Live Team Stats</span>
            </div>
            <div className="space-y-3">
              {performers.length > 0 ? (
                performers.map((rep: any, idx: number) => (
                  <div
                    key={rep.id}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                        #{idx + 1}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800">{rep.name}</div>
                        <div className="text-[11px] text-slate-400 capitalize">{rep.role}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-emerald-600">{rep.leads} leads handled</div>
                      <div className="text-[10px] text-slate-400">{rep.calls} IVR calls logged</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-slate-400">No team activity found</div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 pb-2 text-center text-xs text-slate-400">
          &copy; {new Date().getFullYear()} CRM Cloud. All Rights Reserved.
        </div>
      </div>
    </CrmLayout>
  );
};

export default MasterDashboard;
