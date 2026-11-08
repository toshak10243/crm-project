import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CrmLayout } from '../../components/layout/CrmLayout';
import api from '../../lib/api';

interface StatusBreakdownItem {
  status_id: string;
  status_name: string;
  status_color: string;
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
  const leads: LeadDetailItem[] = reportData?.leads || [];
  const totalCount: number = reportData?.totalCount || 0;

  const selectedManagerName =
    managers.find((m) => m.id === selectedManagerId)?.name || 'All Representatives';

  // Trigger Native Clean Vector PDF Print
  const handlePrintPdf = () => {
    window.print();
  };

  return (
    <CrmLayout>
      <div className="w-full min-h-screen bg-slate-50 text-slate-800 pb-20 font-sans">
        {/* ======================================================== */}
        {/* STRICT PROFESSIONAL PRINT STYLESHEET                     */}
        {/* ======================================================== */}
        <style>{`
          @page {
            size: A4 portrait;
            margin: 12mm 10mm 15mm 10mm;
            @bottom-right {
              content: "Page " counter(page) " of " counter(pages);
              font-family: Arial, sans-serif;
              font-size: 9pt;
              color: #475569;
            }
          }

          /* Default screen state */
          .print-only-container {
            display: none;
          }

          @media print {
            /* 1. Hide everything on screen */
            body * {
              visibility: hidden !important;
            }

            aside, header, nav, .no-print, button, select, input {
              display: none !important;
            }

            /* 2. Show ONLY the dedicated clean vector report container */
            #official-work-report-print,
            #official-work-report-print * {
              visibility: visible !important;
            }

            #official-work-report-print {
              display: block !important;
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              background: #ffffff !important;
              color: #0f172a !important;
              font-family: 'Inter', system-ui, -apple-system, sans-serif !important;
              font-size: 11px !important;
              padding: 0 !important;
              margin: 0 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            .pdf-header-wrapper {
              display: block !important;
              width: 100%;
              border-bottom: 2px solid #003884;
              padding-bottom: 12px;
              margin-bottom: 16px;
            }

            .pdf-footer-wrapper {
              display: flex !important;
              position: fixed;
              bottom: 0;
              left: 0;
              right: 0;
              height: 30px;
              border-top: 1px solid #cbd5e1;
              background: #ffffff;
              padding-top: 6px;
              align-items: center;
              justify-content: space-between;
              font-size: 9px;
              color: #475569;
            }

            .page-counter::after {
              content: counter(page);
            }

            table {
              width: 100% !important;
              border-collapse: collapse !important;
            }

            tr {
              page-break-inside: avoid;
            }

            thead {
              display: table-header-group;
            }

            tfoot {
              display: table-footer-group;
            }

            .break-inside-avoid {
              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }
          }
        `}</style>

        {/* ======================================================== */}
        {/* 1. SCREEN VIEW (Interactive Filter & Search UI)          */}
        {/* ======================================================== */}
        <div className="w-full px-6 py-4 space-y-6 no-print">
          {/* Header Title & Export Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Work Report</h1>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Lead status breakdown and daily activity audit
              </p>
            </div>

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
          <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-2xs">
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
                  Manager / Representative
                </label>
                <select
                  value={selectedManagerId}
                  onChange={(e) => {
                    setSelectedManagerId(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 text-xs bg-slate-50 hover:bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003884]/20 focus:border-[#003884]"
                >
                  <option value="">All Representatives</option>
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

          {/* Table 1: Status Distribution (Screen) */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">Status Distribution</h2>
            <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-2.5 px-4">Lead Status</th>
                    <th className="py-2.5 px-4 text-right">Leads Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {statusBreakdown.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="py-6 text-center text-slate-400">
                        No Data Found
                      </td>
                    </tr>
                  ) : (
                    statusBreakdown.map((item) => (
                      <tr key={item.status_id} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-4 font-semibold text-slate-800 flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: item.status_color || '#3b82f6' }}
                          />
                          <span>{item.status_name}</span>
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                          {item.count}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100/70 border-t-2 border-slate-200 text-xs font-bold text-slate-900">
                    <td className="py-2.5 px-4">Total Leads</td>
                    <td className="py-2.5 px-4 text-right font-mono text-sm font-extrabold text-[#003884]">
                      {totalCount}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Table 2: Lead Details (Screen) */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">Lead Details</h2>
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <span>Rows per page:</span>
                <select
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(Number(e.target.value));
                    setPage(1);
                  }}
                  className="bg-white border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-2.5 px-4">Customer Name</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4">Source</th>
                      <th className="py-2.5 px-4">Next Followup</th>
                      <th className="py-2.5 px-4">Remark</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {isLoading ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400">
                          Loading leads...
                        </td>
                      </tr>
                    ) : leads.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400">
                          No Data Found
                        </td>
                      </tr>
                    ) : (
                      leads.map((lead) => (
                        <tr key={lead.id} className="hover:bg-slate-50/80">
                          <td className="py-2.5 px-4 font-semibold text-slate-900">
                            <div>{lead.first_name} {lead.last_name || ''}</div>
                            <div className="text-[11px] text-slate-400 font-normal">
                              {lead.phone || '-'} {lead.city ? `• ${lead.city}` : ''}
                            </div>
                          </td>
                          <td className="py-2.5 px-4">
                            <span
                              className="inline-block px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase"
                              style={{ backgroundColor: lead.status_color || '#3b82f6' }}
                            >
                              {lead.status_name || 'NEW'}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-slate-600">
                            {lead.lead_from || 'Direct'}
                          </td>
                          <td className="py-2.5 px-4 text-slate-600 whitespace-nowrap">
                            {lead.next_followup_date || '-'}
                          </td>
                          <td className="py-2.5 px-4 text-slate-600 max-w-sm">
                            {lead.remark || '-'}
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

        {/* ======================================================== */}
        {/* 2. DEDICATED PRINT CONTAINER (NO EMOJIS, CLEAN VECTOR)   */}
        {/* Only this appears in PDF output; everything else is hidden */}
        {/* ======================================================== */}
        <div id="official-work-report-print" className="print-only-container">
          {/* Header */}
          <div className="pdf-header-wrapper">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              {/* Left: Logo & Legal Name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                {company.logoUrl ? (
                  <img
                    src={company.logoUrl}
                    alt="Company Logo"
                    style={{ height: '48px', width: 'auto', maxHeight: '48px', objectFit: 'contain' }}
                  />
                ) : (
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '6px',
                      backgroundColor: '#003884',
                      color: '#ffffff',
                      fontWeight: 900,
                      fontSize: '18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {(company.brandName || company.companyName || 'C').charAt(0)}
                  </div>
                )}
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#003884', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {company.companyName || company.brandName || 'CRM SYSTEM'}
                  </div>
                  {company.tagline && (
                    <div style={{ fontSize: '9px', color: '#64748b', marginTop: '1px' }}>
                      {company.tagline}
                    </div>
                  )}
                  <div style={{ fontSize: '9px', color: '#475569', marginTop: '2px', display: 'flex', gap: '12px' }}>
                    {company.gstin && <span><strong>GSTIN:</strong> {company.gstin}</span>}
                    {company.pan && <span><strong>PAN:</strong> {company.pan}</span>}
                    {company.city && <span><strong>Location:</strong> {company.city}, {company.state || 'India'}</span>}
                  </div>
                </div>
              </div>

              {/* Right: Meta Information */}
              <div style={{ textAlign: 'right' }}>
                <div
                  style={{
                    display: 'inline-block',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    backgroundColor: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    color: '#1d4ed8',
                    fontWeight: 700,
                    fontSize: '9px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: '4px',
                  }}
                >
                  WORK REPORT
                </div>
                <div style={{ fontSize: '9px', color: '#475569', lineHeight: 1.4 }}>
                  <div><strong>Generated:</strong> {new Date().toLocaleDateString('en-GB')} {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div>
                  <div><strong>Representative:</strong> {selectedManagerName}</div>
                  <div><strong>Date:</strong> {selectedDate || 'All-Time Records'}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Fixed Footer */}
          <div className="pdf-footer-wrapper">
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {company.website && <span>Website: {company.website}</span>}
              {company.email && <span>Email: {company.email}</span>}
              {company.phone && <span>Phone: {company.phone}</span>}
            </div>
            <div style={{ fontWeight: 600, color: '#334155' }}>
              {company.companyName} &bull; Page <span className="page-counter"></span>
            </div>
          </div>

          {/* Report Body Content (Only Relevant Data: Status Distribution + Leads) */}
          <div style={{ marginTop: '12px' }}>
            {/* 1. Status Distribution Table */}
            <div className="break-inside-avoid" style={{ marginBottom: '18px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                Status Distribution
              </div>
              <table style={{ width: '100%', border: '1px solid #cbd5e1' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #cbd5e1', fontSize: '9px', color: '#475569', textTransform: 'uppercase' }}>
                    <th style={{ padding: '6px 10px', textAlign: 'left', width: '70%' }}>Lead Status</th>
                    <th style={{ padding: '6px 10px', textAlign: 'right', width: '30%' }}>Leads Count</th>
                  </tr>
                </thead>
                <tbody style={{ fontSize: '10px' }}>
                  {statusBreakdown.length === 0 ? (
                    <tr>
                      <td colSpan={2} style={{ padding: '10px', textAlign: 'center', color: '#94a3b8' }}>
                        No Data Found
                      </td>
                    </tr>
                  ) : (
                    statusBreakdown.map((item) => (
                      <tr key={item.status_id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '6px 10px', fontWeight: 600, color: '#1e293b' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor: item.status_color || '#3b82f6',
                              marginRight: '6px',
                              verticalAlign: 'middle',
                            }}
                          />
                          {item.status_name}
                        </td>
                        <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#0f172a' }}>
                          {item.count}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr style={{ backgroundColor: '#f8fafc', borderTop: '2px solid #cbd5e1', fontSize: '10px', fontWeight: 700 }}>
                    <td style={{ padding: '6px 10px', color: '#0f172a' }}>Total Leads</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'monospace', color: '#003884', fontSize: '11px', fontWeight: 800 }}>
                      {totalCount}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* 2. Lead Details Table */}
            <div style={{ marginTop: '14px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                Lead Details
              </div>
              <table style={{ width: '100%', border: '1px solid #cbd5e1' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #cbd5e1', fontSize: '9px', color: '#475569', textTransform: 'uppercase' }}>
                    <th style={{ padding: '6px 8px', textAlign: 'left', width: '25%' }}>Customer Name</th>
                    <th style={{ padding: '6px 8px', textAlign: 'left', width: '15%' }}>Status</th>
                    <th style={{ padding: '6px 8px', textAlign: 'left', width: '15%' }}>Source</th>
                    <th style={{ padding: '6px 8px', textAlign: 'left', width: '15%' }}>Next Followup</th>
                    <th style={{ padding: '6px 8px', textAlign: 'left', width: '30%' }}>Remark</th>
                  </tr>
                </thead>
                <tbody style={{ fontSize: '9.5px', color: '#1e293b' }}>
                  {leads.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '14px', textAlign: 'center', color: '#94a3b8' }}>
                        No Data Found
                      </td>
                    </tr>
                  ) : (
                    leads.map((lead) => (
                      <tr key={lead.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '6px 8px', verticalAlign: 'top', fontWeight: 600 }}>
                          <div>{lead.first_name} {lead.last_name || ''}</div>
                          <div style={{ fontSize: '8.5px', color: '#64748b', fontWeight: 400 }}>
                            {lead.phone || '-'} {lead.city ? `• ${lead.city}` : ''}
                          </div>
                        </td>
                        <td style={{ padding: '6px 8px', verticalAlign: 'top' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 6px',
                              borderRadius: '3px',
                              fontSize: '8.5px',
                              fontWeight: 700,
                              color: '#ffffff',
                              backgroundColor: lead.status_color || '#3b82f6',
                              textTransform: 'uppercase',
                            }}
                          >
                            {lead.status_name || 'NEW'}
                          </span>
                        </td>
                        <td style={{ padding: '6px 8px', verticalAlign: 'top', color: '#475569' }}>
                          {lead.lead_from || 'Direct'}
                        </td>
                        <td style={{ padding: '6px 8px', verticalAlign: 'top', color: '#475569', whiteSpace: 'nowrap' }}>
                          {lead.next_followup_date || '-'}
                        </td>
                        <td style={{ padding: '6px 8px', verticalAlign: 'top', color: '#334155' }}>
                          {lead.remark || '-'}
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
    </CrmLayout>
  );
};

export default WorkReportPage;
