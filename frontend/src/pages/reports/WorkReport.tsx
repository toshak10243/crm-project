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

interface AboutCompanyInfo {
  companyName: string;
  brandName?: string;
  logoUrl?: string;
  tagline?: string;
  gstin?: string;
  pan?: string;
  cin?: string;
  email?: string;
  supportEmail?: string;
  phone?: string;
  website?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
}

const WorkReportPage: React.FC = () => {
  // Selected Filters
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedManagerId, setSelectedManagerId] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [page, setPage] = useState<number>(1);

  const printAreaRef = useRef<HTMLDivElement>(null);

  // 1. Fetch Company Profile (for Real Fixed Header & Footer)
  const { data: aboutData } = useQuery({
    queryKey: ['settings-about-company'],
    queryFn: async () => {
      const res = await api.get('/settings/about-company');
      return res.data?.data as AboutCompanyInfo;
    },
    staleTime: 60 * 1000,
  });

  const company = aboutData || {
    companyName: 'Apex Global Technologies',
    brandName: 'Apex CRM',
    logoUrl: '',
    tagline: 'Enterprise Lead Management & Business Automation System',
    gstin: '08AAAAA0000A1Z5',
    pan: 'ABCDE1234F',
    email: 'contact@apexglobal.com',
    phone: '+91 98765 43210',
    website: 'https://apexglobal.com',
    city: 'Jaipur',
    state: 'Rajasthan',
  };

  // 2. Fetch Managers List
  const { data: managersData } = useQuery({
    queryKey: ['work-report-managers'],
    queryFn: async () => {
      const res = await api.get('/work-report/managers');
      return res.data?.data as ManagerItem[];
    },
  });
  const managers = managersData || [];

  // 3. Fetch Detailed Work Report Data
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

  const selectedManagerName =
    managers.find((m) => m.id === selectedManagerId)?.name || 'All Representatives';

  const maxTrend = Math.max(...weeklyTrend.map((t) => t.count), 1);

  // Trigger Native Clean Vector PDF Print
  const handlePrintPdf = () => {
    window.print();
  };

  return (
    <CrmLayout>
      <div className="w-full min-h-screen bg-slate-50 text-slate-800 pb-20 font-sans">
        {/* ======================================================== */}
        {/* ENTERPRISE PDF PRINT STYLESHEET                          */}
        {/* ======================================================== */}
        <style>{`
          @page {
            size: A4 portrait;
            margin: 12mm 10mm 15mm 10mm;
          }

          @media print {
            aside, header, nav, .no-print, button, select, input {
              display: none !important;
            }

            html, body {
              background: #ffffff !important;
              color: #0f172a !important;
              font-family: 'Inter', system-ui, -apple-system, sans-serif !important;
              font-size: 11px !important;
              margin: 0 !important;
              padding: 0 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            #print-report-root {
              padding: 0 !important;
              margin: 0 !important;
              max-width: 100% !important;
            }

            .pdf-header-wrapper {
              display: block !important;
              position: static;
              width: 100%;
              border-bottom: 2px solid #003884;
              padding-bottom: 10px;
              margin-bottom: 14px;
            }

            .pdf-footer-wrapper {
              display: flex !important;
              position: fixed;
              bottom: 0;
              left: 0;
              right: 0;
              height: 28px;
              border-top: 1px solid #cbd5e1;
              background: #ffffff;
              padding-top: 6px;
              align-items: center;
              justify-content: space-between;
              font-size: 9px;
              color: #64748b;
            }

            .page-number::after {
              content: counter(page);
            }

            table {
              page-break-inside: auto;
              width: 100% !important;
            }
            tr {
              page-break-inside: avoid;
              page-break-after: auto;
            }
            thead {
              display: table-header-group;
            }
            tfoot {
              display: table-footer-group;
            }

            .shadow-2xs, .shadow-sm, .shadow-md, .shadow-lg, .shadow-xl {
              box-shadow: none !important;
              border: 1px solid #e2e8f0 !important;
            }

            .break-inside-avoid {
              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }

            .page-break {
              page-break-before: always;
            }
          }

          .pdf-header-wrapper,
          .pdf-footer-wrapper {
            display: none;
          }
        `}</style>

        <div id="print-report-root" ref={printAreaRef} className="w-full px-6 py-4 space-y-6">
          {/* ======================================================== */}
          {/* FIXED PRINT ONLY HEADER (LOGO + COMPANY + GST + AUDIT)   */}
          {/* ======================================================== */}
          <div className="pdf-header-wrapper">
            <div className="flex items-center justify-between">
              {/* Left: Company Logo & Brand Name */}
              <div className="flex items-center gap-3.5">
                {company.logoUrl ? (
                  <img
                    src={company.logoUrl}
                    alt="Company Logo"
                    className="h-12 w-12 object-contain"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-[#003884] text-white font-black text-xl flex items-center justify-center">
                    {(company.brandName || company.companyName || 'C').charAt(0)}
                  </div>
                )}
                <div>
                  <h1 className="text-lg font-black text-[#003884] tracking-tight leading-tight uppercase">
                    {company.companyName || company.brandName || 'CRM ENTERPRISE'}
                  </h1>
                  {company.tagline && (
                    <p className="text-[10px] text-slate-500 font-medium">{company.tagline}</p>
                  )}
                  <div className="flex items-center gap-3 text-[9px] text-slate-600 mt-0.5">
                    {company.gstin && <span><strong>GSTIN:</strong> {company.gstin}</span>}
                    {company.pan && <span><strong>PAN:</strong> {company.pan}</span>}
                    {company.city && <span><strong>Location:</strong> {company.city}, {company.state || 'India'}</span>}
                  </div>
                </div>
              </div>

              {/* Right: Document & Audit Credentials */}
              <div className="text-right">
                <div className="inline-block px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-[#003884] font-bold text-[10px] tracking-wide uppercase mb-1">
                  OFFICIAL WORK AUDIT REPORT
                </div>
                <div className="text-[10px] text-slate-600 space-y-0.5">
                  <p><strong>Generated:</strong> {new Date().toLocaleDateString('en-GB')} {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</p>
                  <p><strong>Audited Representative:</strong> {selectedManagerName}</p>
                  <p><strong>Date Scope:</strong> {selectedDate || 'All-Time Record Set'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* FIXED PRINT ONLY FOOTER (WEBSITE, CONTACT & PAGE NUMBER)  */}
          {/* ======================================================== */}
          <div className="pdf-footer-wrapper">
            <div className="flex items-center gap-4">
              {company.website && <span>🌐 {company.website}</span>}
              {company.email && <span>✉️ {company.email}</span>}
              {company.phone && <span>📞 {company.phone}</span>}
            </div>
            <div className="font-semibold text-slate-700">
              {company.companyName} &bull; Page <span className="page-number"></span>
            </div>
          </div>

          {/* ======================================================== */}
          {/* SCREEN TOP HEADER (No-print)                             */}
          {/* ======================================================== */}
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
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Search name, phone, city..."
                    className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 hover:bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003884]/20 focus:border-[#003884]"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch('')}
                      className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Clear All Filters */}
              {(selectedDate || selectedManagerId || search) && (
                <div className="self-end">
                  <button
                    onClick={() => {
                      setSelectedDate('');
                      setSelectedManagerId('');
                      setSearch('');
                      setPage(1);
                    }}
                    className="px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition cursor-pointer"
                  >
                    Reset Filters
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ======================================================== */}
          {/* SECTION: 5 KPI METRICS CARDS                              */}
          {/* ======================================================== */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 break-inside-avoid">
            {/* 1. Total Leads */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Leads</span>
                <span className="w-2 h-2 rounded-full bg-blue-500" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900">{totalCount}</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">In selected period</p>
            </div>

            {/* 2. Deals Won / Converted */}
            <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-2xs bg-emerald-50/20">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Deals Won</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-emerald-600">{kpis.converted_leads}</span>
              </div>
              <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">{kpis.conversionRate}% Win Rate</p>
            </div>

            {/* 3. Active Pipeline */}
            <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-2xs bg-amber-50/20">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Active Pipeline</span>
                <span className="w-2 h-2 rounded-full bg-amber-500" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-amber-600">{kpis.active_leads}</span>
              </div>
              <p className="text-[10px] text-amber-600 font-medium mt-0.5">Under negotiation</p>
            </div>

            {/* 4. Total Talk Time */}
            <div className="bg-white p-4 rounded-xl border border-purple-200 shadow-2xs bg-purple-50/20">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700">Total Talk Time</span>
                <span className="w-2 h-2 rounded-full bg-purple-500" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-purple-600">{kpis.callStats.formattedTalkTime}</span>
              </div>
              <p className="text-[10px] text-purple-600 font-medium mt-0.5">{kpis.callStats.total_calls} calls logged</p>
            </div>

            {/* 5. Follow-ups Due */}
            <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-2xs bg-rose-50/20 col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">Follow-ups Due</span>
                <span className="w-2 h-2 rounded-full bg-rose-500" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-rose-600">{kpis.today_followups_due}</span>
              </div>
              <p className="text-[10px] text-rose-600 font-medium mt-0.5">{kpis.overdue_followups} overdue tasks</p>
            </div>
          </div>

          {/* ======================================================== */}
          {/* SECTION: VISUAL INTELLIGENCE (LEAD VELOCITY & CHANNELS)   */}
          {/* ======================================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 break-inside-avoid">
            {/* 7-Day Velocity Bar Chart */}
            <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Lead Flow Velocity (Last 7 Days)</h3>
                  <p className="text-[10px] text-slate-400">Daily leads incoming vs active handling</p>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-[#003884]" />
                  Leads Logged
                </div>
              </div>

              {/* Vector Bar Chart */}
              <div className="h-40 flex items-end justify-between gap-3 pt-4 px-2">
                {weeklyTrend.map((t, idx) => {
                  const pct = Math.round((t.count / maxTrend) * 100);
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                      <span className="text-[10px] font-bold text-slate-700">{t.count}</span>
                      <div className="w-full bg-slate-100 rounded-t h-full max-h-28 flex items-end">
                        <div
                          style={{ height: `${Math.max(pct, t.count > 0 ? 8 : 2)}%` }}
                          className={`w-full rounded-t transition-all duration-300 ${
                            t.count > 0 ? 'bg-[#003884]' : 'bg-slate-200'
                          }`}
                        />
                      </div>
                      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-tight">{t.day_label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Lead Sources Distribution Bars */}
            <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="mb-4 pb-2 border-b border-slate-100">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Top Lead Sources</h3>
                  <p className="text-[10px] text-slate-400">Origin channel distribution</p>
                </div>

                <div className="space-y-3">
                  {sourceBreakdown.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-6">No source data</p>
                  ) : (
                    sourceBreakdown.slice(0, 5).map((src, i) => {
                      const sharePct = totalCount > 0 ? Math.round((src.count / totalCount) * 100) : 0;
                      return (
                        <div key={i} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-700">{src.source_name}</span>
                            <span className="font-bold text-slate-900">{src.count} ({sharePct}%)</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              style={{ width: `${sharePct}%` }}
                              className="h-full bg-gradient-to-r from-blue-500 to-[#003884] rounded-full"
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 mt-2 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Unique Channels Tracked:</span>
                <span className="font-bold text-slate-900">{sourceBreakdown.length}</span>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* SECTION 1: LEAD STATUS DISTRIBUTION TABLE                */}
          {/* ======================================================== */}
          <div className="space-y-3 break-inside-avoid">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Status Distribution</h2>
              <p className="text-[11px] text-slate-500">Aggregate count across sales pipeline stages</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-6">LEAD STATUS</th>
                    <th className="py-3 px-6 text-right">LEADS COUNT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {statusBreakdown.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="py-8 text-center text-slate-400 text-xs">
                        No Data Found
                      </td>
                    </tr>
                  ) : (
                    statusBreakdown.map((item) => (
                      <tr key={item.status_id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-6 font-semibold text-slate-800 flex items-center gap-2.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: item.status_color || '#3b82f6' }}
                          />
                          <span>{item.status_name}</span>
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
                    <td className="py-3.5 px-6">Total Leads</td>
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
                      <th className="py-3 px-6">CUSTOMER / NAME</th>
                      <th className="py-3 px-6">STATUS</th>
                      <th className="py-3 px-6">SOURCE</th>
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
                          <td className="py-3 px-6 font-semibold text-slate-900 align-top">
                            <div>{lead.first_name} {lead.last_name || ''}</div>
                            <div className="text-[11px] text-slate-400 font-normal mt-0.5">
                              {lead.phone || 'No Phone'} {lead.city ? `• ${lead.city}` : ''}
                            </div>
                          </td>

                          {/* Status Badge */}
                          <td className="py-3 px-6 align-top">
                            <span
                              className="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold text-white shadow-2xs uppercase tracking-wide"
                              style={{ backgroundColor: lead.status_color || '#3b82f6' }}
                            >
                              {lead.status_name || 'NEW'}
                            </span>
                          </td>

                          {/* Lead Source */}
                          <td className="py-3 px-6 text-xs text-slate-600 align-top">
                            {lead.lead_from || 'Direct'}
                          </td>

                          {/* Next Followup Date */}
                          <td className="py-3 px-6 text-xs text-slate-600 align-top whitespace-nowrap">
                            {lead.next_followup_date || '-'}
                          </td>

                          {/* Remark */}
                          <td className="py-3 px-6 text-xs text-slate-600 align-top whitespace-pre-line leading-relaxed max-w-sm">
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
