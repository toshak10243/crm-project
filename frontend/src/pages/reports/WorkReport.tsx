import React, { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CrmLayout } from '../../components/layout/CrmLayout';
import api from '../../lib/api';

interface StatusBreakdownItem {
  status_id: string;
  status_name: string;
  status_color: string;
  count: number;
}

interface SourceBreakdownItem {
  source_name: string;
  count: number;
}

interface WeeklyTrendItem {
  day_label: string;
  count: number;
}

interface LeadDetailItem {
  id: string;
  first_name: string;
  last_name?: string;
  full_name: string;
  phone?: string;
  city?: string;
  lead_from?: string;
  remark?: string;
  next_followup_date?: string;
  created_at: string;
  status_name: string;
  status_color?: string;
  manager_name?: string;
}

interface ManagerItem {
  id: string;
  name: string;
  email: string;
  role: string;
}

const WorkReportPage: React.FC = () => {
  // Selected Filters
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedManagerId, setSelectedManagerId] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [page, setPage] = useState<number>(1);

  const printAreaRef = useRef<HTMLDivElement>(null);

  // 1. Fetch Managers List
  const { data: managersData } = useQuery({
    queryKey: ['work-report-managers'],
    queryFn: async () => {
      const res = await api.get('/work-report/managers');
      return res.data?.data as ManagerItem[];
    },
  });
  const managers = managersData || [];

  // 2. Fetch Detailed Work Report Data
  const { data: reportData, isLoading } = useQuery({
    queryKey: ['work-report-data', selectedDate, selectedManagerId, search, page, rowsPerPage],
    queryFn: async () => {
      const params: any = {
        page,
        limit: rowsPerPage,
      };
      if (selectedDate) params.date = selectedDate;
      if (selectedManagerId) params.managerId = selectedManagerId;
      if (search.trim()) params.search = search.trim();

      const res = await api.get('/work-report/data', { params });
      return res.data?.data;
    },
  });

  const statusBreakdown: StatusBreakdownItem[] = reportData?.statusBreakdown || [];
  const sourceBreakdown: SourceBreakdownItem[] = reportData?.sourceBreakdown || [];
  const weeklyTrend: WeeklyTrendItem[] = reportData?.weeklyTrend || [];
  const leads: LeadDetailItem[] = reportData?.leads || [];
  const totalCount: number = reportData?.totalCount || 0;
  const kpis = reportData?.kpis || {
    converted_leads: 0,
    active_leads: 0,
    lost_leads: 0,
    today_followups_due: 0,
    overdue_followups: 0,
    conversionRate: 0,
    callStats: { total_calls: 0, formattedTalkTime: '0m', outgoing_calls: 0, connected_calls: 0 },
  };
  const managerInfo = reportData?.managerInfo;

  const selectedManagerName =
    managers.find((m) => m.id === selectedManagerId)?.name || 'All Representatives';

  // Find max count for weekly trend bar chart heights
  const maxTrend = Math.max(...weeklyTrend.map((t) => t.count), 1);

  // PDF Export
  const handlePrintPdf = () => {
    window.print();
  };

  return (
    <CrmLayout>
      <div className="w-full min-h-screen bg-slate-50 text-slate-800 pb-20 font-sans">
        {/* Print Stylesheet */}
        <style>{`
          @media print {
            aside, header, nav, .no-print, button, select, input {
              display: none !important;
            }
            body, main, #print-report-root {
              background: white !important;
              color: black !important;
              padding: 0 !important;
              margin: 0 !important;
            }
            .print-only {
              display: block !important;
            }
            .shadow-2xs, .shadow-sm, .shadow-md, .shadow-lg {
              box-shadow: none !important;
              border: 1px solid #cbd5e1 !important;
            }
            .page-break {
              page-break-before: always;
            }
          }
          .print-only {
            display: none;
          }
        `}</style>

        <div id="print-report-root" ref={printAreaRef} className="w-full px-6 py-4 space-y-6">
          {/* Print Only Header Banner */}
          <div className="print-only border-b-2 border-[#003884] pb-4 mb-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-black text-[#003884] tracking-tight">CRM ENTERPRISE WORK REPORT</h1>
                <p className="text-xs text-slate-600">Executive Performance Audit & Pipeline Intelligence</p>
              </div>
              <div className="text-right text-xs text-slate-700">
                <p><strong>Generated On:</strong> {new Date().toLocaleDateString('en-GB')} {new Date().toLocaleTimeString('en-GB')}</p>
                <p><strong>Representative:</strong> {selectedManagerName}</p>
                {selectedDate && <p><strong>Audit Date:</strong> {selectedDate}</p>}
              </div>
            </div>
          </div>

          {/* Screen Top Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Work Report</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 uppercase tracking-wide">
                  Intelligence 360°
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Audit sales team daily calling activity, conversion metrics, talk time, and complete lead pipeline kacha chitta
              </p>
            </div>

            {/* Print / Download Button */}
            <div className="flex items-center gap-3">
              <button
                onClick={handlePrintPdf}
                type="button"
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#003884] hover:bg-[#002860] active:scale-98 transition rounded-lg shadow-sm cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <span>Export PDF / Print</span>
              </button>
            </div>
          </div>

          {/* Filter Bar (Date + Manager + Search) */}
          <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-2xs no-print">
            <div className="flex flex-wrap items-center gap-4">
              {/* Date Filter */}
              <div className="w-full sm:w-52">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      setPage(1);
                    }}
                    className="w-full px-3 py-2 text-xs bg-slate-50 hover:bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003884]/20 focus:border-[#003884]"
                  />
                  {selectedDate && (
                    <button
                      onClick={() => setSelectedDate('')}
                      className="absolute right-7 top-2 text-xs text-slate-400 hover:text-slate-700 cursor-pointer"
                      title="Clear date"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Manager Dropdown */}
              <div className="w-full sm:w-64">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Manager / Agent
                </label>
                <select
                  value={selectedManagerId}
                  onChange={(e) => {
                    setSelectedManagerId(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 text-xs bg-slate-50 hover:bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003884]/20 focus:border-[#003884]"
                >
                  <option value="">Select Manager (All)</option>
                  {managers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Instant Search in Leads */}
              <div className="w-full sm:w-64">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Search Leads
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    placeholder="Search name, phone, city..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 hover:bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003884]/20 focus:border-[#003884]"
                  />
                </div>
              </div>

              {/* Reset Filters */}
              {(selectedDate || selectedManagerId || search) && (
                <div className="self-end pb-1.5">
                  <button
                    onClick={() => {
                      setSelectedDate('');
                      setSelectedManagerId('');
                      setSearch('');
                      setPage(1);
                    }}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-700 underline cursor-pointer"
                  >
                    Reset All Filters
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Active Manager Header Profile Banner */}
          {managerInfo && (
            <div className="bg-gradient-to-r from-[#003884] via-[#002860] to-[#0f172a] text-white p-5 rounded-xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center text-xl font-black text-amber-300 shadow-inner">
                  {managerInfo.name?.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-extrabold text-white">{managerInfo.name}</h2>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Active
                    </span>
                  </div>
                  <p className="text-xs text-blue-200 mt-0.5">
                    {managerInfo.email} • {managerInfo.phone || 'No phone'} • Role: <span className="capitalize">{managerInfo.role}</span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6 border-t md:border-t-0 md:border-l border-white/15 pt-3 md:pt-0 md:pl-6 text-xs">
                <div>
                  <div className="text-blue-200 text-[11px]">Total Pipeline</div>
                  <div className="text-xl font-black text-white mt-0.5">{totalCount}</div>
                </div>
                <div>
                  <div className="text-blue-200 text-[11px]">Conversion Rate</div>
                  <div className="text-xl font-black text-emerald-400 mt-0.5">{kpis.conversionRate}%</div>
                </div>
                <div>
                  <div className="text-blue-200 text-[11px]">Calls Made</div>
                  <div className="text-xl font-black text-amber-300 mt-0.5">{kpis.callStats.total_calls}</div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* GOOGLE-LEVEL EXECUTIVE 5-METRIC KPI CARDS                */}
          {/* ======================================================== */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {/* 1. Total Leads */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                <span>Total Leads</span>
                <span className="w-2 h-2 rounded-full bg-blue-500" />
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2">{totalCount}</div>
              <div className="text-[11px] text-slate-400 mt-1">In selected period</div>
            </div>

            {/* 2. Won / Converted */}
            <div className="bg-white p-4 rounded-xl border border-emerald-200/80 bg-emerald-50/20 shadow-2xs">
              <div className="flex items-center justify-between text-emerald-700 text-xs font-bold">
                <span>Deals Won</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>
              <div className="text-2xl font-black text-emerald-700 mt-2">{kpis.converted_leads}</div>
              <div className="text-[11px] text-emerald-600 font-semibold mt-1">
                {kpis.conversionRate}% Win Rate
              </div>
            </div>

            {/* 3. Active Followups Pipeline */}
            <div className="bg-white p-4 rounded-xl border border-amber-200/80 bg-amber-50/20 shadow-2xs">
              <div className="flex items-center justify-between text-amber-800 text-xs font-bold">
                <span>Active Pipeline</span>
                <span className="w-2 h-2 rounded-full bg-amber-500" />
              </div>
              <div className="text-2xl font-black text-amber-900 mt-2">{kpis.active_leads}</div>
              <div className="text-[11px] text-amber-700 mt-1">Under negotiation</div>
            </div>

            {/* 4. Total Talk Time */}
            <div className="bg-white p-4 rounded-xl border border-purple-200/80 bg-purple-50/20 shadow-2xs">
              <div className="flex items-center justify-between text-purple-800 text-xs font-bold">
                <span>Total Talk Time</span>
                <span className="w-2 h-2 rounded-full bg-purple-500" />
              </div>
              <div className="text-2xl font-black text-purple-900 mt-2">{kpis.callStats.formattedTalkTime}</div>
              <div className="text-[11px] text-purple-700 mt-1">
                {kpis.callStats.total_calls} calls logged
              </div>
            </div>

            {/* 5. Followup Alerts (Overdue / Today) */}
            <div className="bg-white p-4 rounded-xl border border-rose-200/80 bg-rose-50/20 shadow-2xs col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between text-rose-800 text-xs font-bold">
                <span>Follow-ups Due</span>
                <span className="w-2 h-2 rounded-full bg-rose-500" />
              </div>
              <div className="text-2xl font-black text-rose-700 mt-2">{kpis.today_followups_due}</div>
              <div className="text-[11px] text-rose-600 font-semibold mt-1">
                {kpis.overdue_followups} overdue tasks
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* INTERACTIVE GRAPHS & VISUAL ANALYTICS ROW                */}
          {/* ======================================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart 1: 7-Day Performance Bar Chart */}
            <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Lead Flow Velocity (Last 7 Days)</h3>
                  <p className="text-[11px] text-slate-500">Daily leads incoming vs active handling</p>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <span className="inline-block w-2.5 h-2.5 rounded bg-[#003884]" />
                  <span>Leads Logged</span>
                </div>
              </div>

              {/* Bar Chart Visualization */}
              <div className="h-44 flex items-end justify-between gap-3 pt-6 pb-2 px-2 border-b border-slate-100">
                {weeklyTrend.map((t, idx) => {
                  const heightPercent = Math.max((t.count / maxTrend) * 100, 8);
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                      <div className="text-[10px] font-bold text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity">
                        {t.count}
                      </div>
                      <div
                        className="w-full max-w-[36px] bg-gradient-to-t from-[#003884] to-[#0284c7] rounded-t-md transition-all duration-300 group-hover:brightness-110 shadow-2xs"
                        style={{ height: `${heightPercent}%` }}
                      />
                      <span className="text-[10px] font-medium text-slate-500 mt-1">{t.day_label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Chart 2: Lead Channel Breakdown (Progress distribution) */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Top Lead Sources</h3>
                <p className="text-[11px] text-slate-500 mb-4">Origin channel distribution</p>

                <div className="space-y-3">
                  {sourceBreakdown.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-400">No source data</div>
                  ) : (
                    sourceBreakdown.map((src, i) => {
                      const pct = totalCount > 0 ? Math.round((src.count / totalCount) * 100) : 0;
                      return (
                        <div key={i} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-semibold text-slate-800">{src.source_name}</span>
                            <span className="text-slate-500 font-mono">{src.count} ({pct}%)</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-[#003884] h-full rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Top Performing:</span>
                <span className="font-bold text-slate-900">{sourceBreakdown[0]?.source_name || '-'}</span>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* SECTION 1: LEAD STATUS & COUNT TABLE (Exact Screenshot)  */}
          {/* ======================================================== */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Pipeline Stage Distribution</h3>
                <p className="text-[11px] text-slate-500">Live counts grouped by lead statuses</p>
              </div>
              <span className="text-xs font-semibold text-slate-600">
                Total Status Categories: <span className="text-slate-900 font-bold">{statusBreakdown.length}</span>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-6">LEAD STATUS</th>
                    <th className="py-3 px-6 text-right">COUNT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {isLoading ? (
                    <tr>
                      <td colSpan={2} className="py-8 text-center text-slate-400 text-xs">
                        Loading status breakdown...
                      </td>
                    </tr>
                  ) : statusBreakdown.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="py-8 text-center text-slate-400 text-sm">
                        No Data Found
                      </td>
                    </tr>
                  ) : (
                    statusBreakdown.map((item) => (
                      <tr key={item.status_id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-6 font-semibold flex items-center gap-3">
                          <span
                            className="w-3 h-3 rounded-full flex-shrink-0 shadow-2xs"
                            style={{ backgroundColor: item.status_color || '#3b82f6' }}
                          />
                          <span className="text-slate-900">{item.status_name}</span>
                        </td>
                        <td className="py-3.5 px-6 text-right font-mono font-bold text-slate-900">
                          {item.count}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100/70 border-t-2 border-slate-200 text-sm font-bold text-slate-900">
                    <td className="py-3.5 px-6">Total</td>
                    <td className="py-3.5 px-6 text-right font-mono text-base font-extrabold text-[#003884]">
                      {totalCount}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* ======================================================== */}
          {/* SECTION 2: LEAD DETAILS (KACHA CHITTA TABLE)             */}
          {/* ======================================================== */}
          <div className="space-y-3 page-break">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">Lead Details & Activity History</h2>
                <p className="text-[11px] text-slate-500">Every single customer lead record, status badge, call remarks and followups</p>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-600 no-print">
                <span>Rows per page:</span>
                <select
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(Number(e.target.value));
                    setPage(1);
                  }}
                  className="bg-white border border-slate-300 rounded px-2.5 py-1 text-xs focus:outline-none"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-6">CUSTOMER / FIRST NAME</th>
                      <th className="py-3 px-6">LEAD STATUS</th>
                      <th className="py-3 px-6">SOURCE / CHANNEL</th>
                      <th className="py-3 px-6">NEXT FOLLOWUP</th>
                      <th className="py-3 px-6">REMARK / ACTIVITY</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {isLoading ? (
                      <tr>
                        <td colSpan={5} className="py-10 text-center text-slate-400 text-xs">
                          Loading leads kacha chitta...
                        </td>
                      </tr>
                    ) : leads.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-10 text-center text-slate-400 text-sm">
                          No Data Found
                        </td>
                      </tr>
                    ) : (
                      leads.map((lead) => (
                        <tr key={lead.id} className="hover:bg-slate-50/80 transition-colors">
                          {/* Name & Phone */}
                          <td className="py-3.5 px-6 font-semibold text-slate-900 align-top">
                            <div>{lead.first_name} {lead.last_name || ''}</div>
                            <div className="text-[11px] text-slate-400 font-normal mt-0.5">
                              {lead.phone || 'No Phone'} {lead.city ? `• ${lead.city}` : ''}
                            </div>
                          </td>

                          {/* Status Badge */}
                          <td className="py-3.5 px-6 align-top">
                            <span
                              className="inline-block px-2.5 py-0.5 rounded text-[11px] font-bold text-white shadow-2xs uppercase tracking-wide"
                              style={{ backgroundColor: lead.status_color || '#3b82f6' }}
                            >
                              {lead.status_name || 'NEW'}
                            </span>
                          </td>

                          {/* Lead Source */}
                          <td className="py-3.5 px-6 text-xs text-slate-600 align-top">
                            {lead.lead_from || 'Direct'}
                          </td>

                          {/* Next Followup Date */}
                          <td className="py-3.5 px-6 text-xs text-slate-600 align-top whitespace-nowrap">
                            {lead.next_followup_date || '-'}
                          </td>

                          {/* Remark */}
                          <td className="py-3.5 px-6 text-xs text-slate-600 align-top whitespace-pre-line leading-relaxed max-w-sm">
                            {lead.remark ? (
                              <div className="p-2 bg-slate-50 border border-slate-200 rounded text-slate-700 text-[11px]">
                                {lead.remark}
                              </div>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </CrmLayout>
  );
};

export default WorkReportPage;
