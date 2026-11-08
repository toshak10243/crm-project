import React, { useState } from 'react';
import { CrmLayout } from '../../components/layout/CrmLayout';
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

// Trend Area Data
const chartData = [
  { date: '27/10', leads: 0 },
  { date: '28/10', leads: 0 },
  { date: '29/10', leads: 0 },
  { date: '30/10', leads: 0 },
  { date: '31/10', leads: 3 },
  { date: '01/11', leads: 1 },
  { date: '02/11', leads: 7 },
];

// Lead Sources Distribution
const leadSourceData = [
  { name: 'IndiaMART', value: 42, color: '#3b82f6' },
  { name: 'WhatsApp', value: 28, color: '#10b981' },
  { name: 'Website', value: 18, color: '#8b5cf6' },
  { name: 'Meta Ads', value: 12, color: '#f59e0b' },
];

// Conversion Funnel Data
const funnelData = [
  { stage: 'New', count: 124 },
  { stage: 'Contacted', count: 86 },
  { stage: 'Qualified', count: 54 },
  { stage: 'Proposal', count: 32 },
  { stage: 'Converted', count: 18 },
];

const MasterDashboard: React.FC = () => {
  // Dialpad state
  const [dialedNumber, setDialedNumber] = useState('');
  const [callStatus, setCallStatus] = useState<string | null>(null);

  // Filter state
  const [startDate, setStartDate] = useState('2026-10-27');
  const [endDate, setEndDate] = useState('2026-11-02');
  const [manager, setManager] = useState('');
  const [status, setStatus] = useState('');

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
    }, 1500);
  };

  const handleResetFilter = () => {
    setStartDate('2026-10-27');
    setEndDate('2026-11-02');
    setManager('');
    setStatus('');
  };

  return (
    <CrmLayout>
      <div className="space-y-8 max-w-7xl">
        {/* Top Section: 4 Stat Cards + Enhanced Telephony Dialpad */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: 4 Metric Cards */}
          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* 1. Total Lead */}
            <div className="bg-[#fef3c7]/60 border border-amber-200/80 rounded-2xl p-6 flex items-center gap-5 transition-all">
              <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Lead</p>
                <h3 className="text-3xl font-extrabold text-slate-900 mt-1">7,776</h3>
                <p className="text-[11px] text-amber-700/80 font-medium mt-0.5">+142 this week</p>
              </div>
            </div>

            {/* 2. Total Branch */}
            <div className="bg-[#e0f2fe]/60 border border-sky-200/80 rounded-2xl p-6 flex items-center gap-5 transition-all">
              <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Branch</p>
                <h3 className="text-3xl font-extrabold text-slate-900 mt-1">3</h3>
                <p className="text-[11px] text-sky-700/80 font-medium mt-0.5">Mumbai, Delhi, BLR</p>
              </div>
            </div>

            {/* 3. Total Counsellor / Sales Agents */}
            <div className="bg-[#dcfce7]/60 border border-emerald-200/80 rounded-2xl p-6 flex items-center gap-5 transition-all">
              <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Counsellor</p>
                <h3 className="text-3xl font-extrabold text-slate-900 mt-1">6</h3>
                <p className="text-[11px] text-emerald-700/80 font-medium mt-0.5">All agents active</p>
              </div>
            </div>

            {/* 4. Today's Birthdays */}
            <div className="bg-[#f3e8ff]/60 border border-purple-200/80 rounded-2xl p-6 flex items-center gap-5 transition-all">
              <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.701 2.701 0 00-1.5-.454M9 6v2m3-2v2m3-2v2M9 3h.01M12 3h.01M15 3h.01M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Today's Birthdays</p>
                <h3 className="text-3xl font-extrabold text-slate-900 mt-1">0</h3>
                <p className="text-[11px] text-purple-700/80 font-medium mt-0.5">Automated WA ready</p>
              </div>
            </div>
          </div>

          {/* Right: Enhanced Enterprise Telephony Dialpad */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Cloud IVR Telephony</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-600 font-semibold border border-blue-100">
                Line 1
              </span>
            </div>

            {/* Dialed Display */}
            <div className="min-h-[52px] bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 flex flex-col items-end justify-center mb-4 transition-all">
              <div className="text-xl font-mono font-bold text-slate-900 tracking-wider truncate w-full text-right">
                {dialedNumber ? (
                  dialedNumber
                ) : (
                  <span className="text-slate-300 font-normal text-sm font-sans">Enter phone number...</span>
                )}
              </div>
              {callStatus && (
                <div className="text-[11px] text-emerald-600 font-semibold animate-pulse mt-0.5">
                  {callStatus}
                </div>
              )}
            </div>

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { k: '1', sub: '' },
                { k: '2', sub: 'ABC' },
                { k: '3', sub: 'DEF' },
                { k: '4', sub: 'GHI' },
                { k: '5', sub: 'JKL' },
                { k: '6', sub: 'MNO' },
                { k: '7', sub: 'PQRS' },
                { k: '8', sub: 'TUV' },
                { k: '9', sub: 'WXYZ' },
                { k: '*', sub: '' },
                { k: '0', sub: '+' },
                { k: '#', sub: '' },
              ].map((item) => (
                <button
                  key={item.k}
                  onClick={() => handleDial(item.k)}
                  className="h-12 rounded-xl bg-slate-50 hover:bg-slate-100 active:bg-blue-50 text-slate-800 font-bold text-base transition-all flex flex-col items-center justify-center border border-slate-200/80 shadow-2xs hover:border-slate-300"
                >
                  <span className="leading-none">{item.k}</span>
                  {item.sub && <span className="text-[9px] font-normal text-slate-400 mt-0.5">{item.sub}</span>}
                </button>
              ))}
            </div>

            {/* Call Action Button */}
            <div className="mt-3.5">
              <button
                onClick={handleCall}
                disabled={!dialedNumber}
                className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span>Call Now</span>
              </button>
            </div>

            {/* Bottom Controls */}
            <div className="grid grid-cols-2 gap-2.5 mt-2.5">
              <button
                onClick={handleBackspace}
                className="h-10 rounded-xl bg-amber-50 hover:bg-amber-100 active:bg-amber-200 border border-amber-200 text-amber-800 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414-6.414a2 2 0 011.414-.586H19a2 2 0 012 2v10a2 2 0 01-2 2h-9.172a2 2 0 01-1.414-.586L3 12z" />
                </svg>
                <span>Backspace</span>
              </button>
              <button
                onClick={handleClear}
                className="h-10 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 border border-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Section 2: Leads By Date Chart + Filters (Screenshot 3) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Leads by Date</h2>
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
              <label className="block text-xs font-semibold text-slate-600 mb-1">Manager</label>
              <select
                value={manager}
                onChange={(e) => setManager(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-600"
              >
                <option value="">Select Manager</option>
                <option value="manager_1">Rohan Mehta</option>
                <option value="manager_2">Pooja Gupta</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-600"
              >
                <option value="">Select Lead Status</option>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="interested">Interested</option>
                <option value="converted">Converted</option>
                <option value="lost">Lost</option>
              </select>
            </div>
            <div>
              <button
                type="button"
                onClick={handleResetFilter}
                className="w-full py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Area Chart View */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-semibold text-slate-800">Leads Acquisition Trend</p>
                <p className="text-[11px] text-slate-400">76 total leads captured in selected timeframe</p>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="leadsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
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
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="leads"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#leadsGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Section 3: Additional Graphs (Lead Sources Pie & Sales Pipeline Funnel) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Lead Sources Distribution (Donut Chart) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Lead Sources Distribution</h3>
                <p className="text-[11px] text-slate-400">Where your high-converting leads originate</p>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100">
                100% Volume
              </span>
            </div>

            <div className="h-60 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={leadSourceData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                  >
                    {leadSourceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e2e8f0',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Source Badges */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
              {leadSourceData.map((s, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="font-medium text-slate-700">{s.name}</span>
                  </div>
                  <span className="font-bold text-slate-900">{s.value}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Sales Pipeline Funnel (Bar Chart) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Pipeline Stage Conversion</h3>
                <p className="text-[11px] text-slate-400">Current deal count across pipeline stages</p>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-100">
                Live Stages
              </span>
            </div>

            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="stage" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e2e8f0',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600">
              <span>Overall Pipeline Conversion Efficiency:</span>
              <span className="font-bold text-emerald-600 text-sm">14.5%</span>
            </div>
          </div>
        </div>

        {/* Section 4: Recent Leads & Top Sales Reps */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Leads */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Recent Leads</h3>
              <span className="text-xs text-blue-600 font-semibold cursor-pointer hover:underline">
                View All Leads
              </span>
            </div>
            <div className="space-y-3">
              {[
                { name: 'Rajesh Mehra', comp: 'Mehra Exports', time: '10 mins ago', status: 'New', phone: '+91 98112 34567' },
                { name: 'Suresh Singhania', comp: 'Apex Packagings', time: '1 hour ago', status: 'Follow Up', phone: '+91 97234 56789' },
                { name: 'Anil Kapoor', comp: 'Green Energy', time: '3 hours ago', status: 'Interested', phone: '+91 99887 76655' },
              ].map((l, i) => (
                <div key={i} className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                  <div>
                    <div className="font-semibold text-slate-800">{l.name} <span className="font-normal text-slate-400">({l.comp})</span></div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{l.phone} • {l.time}</div>
                  </div>
                  <span className="px-2.5 py-1 rounded text-[10px] font-semibold bg-blue-50 text-blue-600 border border-blue-200">
                    {l.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Sales Team Members */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Best Sales Team Performers</h3>
              <span className="text-xs text-slate-400">This Month</span>
            </div>
            <div className="space-y-3">
              {[
                { name: 'Amit Verma', role: 'Senior Sales Exec', leads: 42, calls: 148, conv: '18.4%' },
                { name: 'Priya Sharma', role: 'Sales Specialist', leads: 38, calls: 132, conv: '16.2%' },
                { name: 'Rohan Mehta', role: 'Sales Consultant', leads: 29, calls: 98, conv: '14.0%' },
              ].map((rep, idx) => (
                <div key={idx} className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                      #{idx + 1}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800">{rep.name}</div>
                      <div className="text-[11px] text-slate-400">{rep.role}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-emerald-600">{rep.leads} closed</div>
                    <div className="text-[10px] text-slate-400">{rep.calls} calls ({rep.conv})</div>
                  </div>
                </div>
              ))}
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
