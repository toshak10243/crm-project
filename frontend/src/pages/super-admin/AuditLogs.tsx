import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import SuperAdminLayout from '../../components/layout/SuperAdminLayout';
import {
  ClipboardList, Search, ChevronLeft, ChevronRight,
  Building2, Trash2, CheckCircle2, XCircle,
  PlusCircle, ShieldCheck, RefreshCw, Download,
  Calendar, FileText,
} from 'lucide-react';
import { formatDateTime } from '../../lib/utils';

const actionConfig: Record<string, { label: string; icon: any; bg: string; text: string }> = {
  CREATED_COMPANY:        { label: 'Company Created',        icon: PlusCircle,   bg: 'bg-blue-50',   text: 'text-blue-700'   },
  DELETED_COMPANY:        { label: 'Company Deleted',        icon: Trash2,       bg: 'bg-red-50',    text: 'text-red-700'    },
  ACTIVATED_COMPANY:      { label: 'Company Activated',      icon: CheckCircle2, bg: 'bg-green-50',  text: 'text-green-700'  },
  DEACTIVATED_COMPANY:    { label: 'Company Deactivated',    icon: XCircle,      bg: 'bg-amber-50',  text: 'text-amber-700'  },
  ACTIVATED_SUBSCRIPTION: { label: 'Subscription Activated', icon: ShieldCheck,  bg: 'bg-purple-50', text: 'text-purple-700' },
  REJECTED_PAYMENT:       { label: 'Payment Rejected',       icon: XCircle,      bg: 'bg-red-50',    text: 'text-red-700'    },
};

const defaultConfig = { label: 'Action', icon: RefreshCw, bg: 'bg-slate-50', text: 'text-slate-700' };

const ACTION_OPTIONS = [
  { value: '', label: 'All Actions' },
  { value: 'CREATED_COMPANY', label: 'Company Created' },
  { value: 'DELETED_COMPANY', label: 'Company Deleted' },
  { value: 'ACTIVATED_COMPANY', label: 'Company Activated' },
  { value: 'DEACTIVATED_COMPANY', label: 'Company Deactivated' },
  { value: 'ACTIVATED_SUBSCRIPTION', label: 'Subscription Activated' },
  { value: 'REJECTED_PAYMENT', label: 'Payment Rejected' },
];

const SuperAdminAuditLogs = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [exportingCsv, setExportingCsv] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const { data: pendingCount } = useQuery({
    queryKey: ['super-admin-payments-count'],
    queryFn: async () => {
      const res = await api.get('/super-admin/payments/pending?limit=1');
      return res.data.meta?.total || 0;
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['super-admin-audit-logs', page, actionFilter, fromDate, toDate],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '15' });
      if (actionFilter) params.set('action', actionFilter);
      if (fromDate) params.set('fromDate', fromDate);
      if (toDate) params.set('toDate', toDate);
      const res = await api.get(`/super-admin/audit-logs?${params}`);
      return res.data;
    },
  });

  const logs = data?.data || [];
  const meta = data?.meta || {};

  const filtered = search
    ? logs.filter((log: any) =>
        log.entity_name?.toLowerCase().includes(search.toLowerCase()) ||
        log.performed_by_name?.toLowerCase().includes(search.toLowerCase()) ||
        log.action?.toLowerCase().includes(search.toLowerCase())
      )
    : logs;

  const handleFilterChange = (setter: any, val: string) => {
    setter(val);
    setPage(1);
  };

  const clearFilters = () => {
    setActionFilter('');
    setFromDate('');
    setToDate('');
    setSearch('');
    setPage(1);
  };

  const hasFilters = actionFilter || fromDate || toDate || search;

  // CSV Export
  const handleCsvExport = async () => {
    setExportingCsv(true);
    try {
      const params = new URLSearchParams();
      if (actionFilter) params.set('action', actionFilter);
      if (fromDate) params.set('fromDate', fromDate);
      if (toDate) params.set('toDate', toDate);
      const res = await api.get(`/super-admin/audit-logs/export?${params}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('CSV export failed', e);
    } finally {
      setExportingCsv(false);
    }
  };

  // PDF Export — professional print
  const handlePdfExport = async () => {
    setExportingPdf(true);
    try {
      const params = new URLSearchParams({ page: '1', limit: '5000' });
      if (actionFilter) params.set('action', actionFilter);
      if (fromDate) params.set('fromDate', fromDate);
      if (toDate) params.set('toDate', toDate);
      const res = await api.get(`/super-admin/audit-logs?${params}`);
      const allLogs = res.data?.data || [];

      const actionLabels: Record<string, string> = {
        CREATED_COMPANY: 'Company Created',
        DELETED_COMPANY: 'Company Deleted',
        ACTIVATED_COMPANY: 'Company Activated',
        DEACTIVATED_COMPANY: 'Company Deactivated',
        ACTIVATED_SUBSCRIPTION: 'Subscription Activated',
        REJECTED_PAYMENT: 'Payment Rejected',
      };

      const actionColors: Record<string, string> = {
        CREATED_COMPANY: '#2563eb',
        DELETED_COMPANY: '#dc2626',
        ACTIVATED_COMPANY: '#16a34a',
        DEACTIVATED_COMPANY: '#d97706',
        ACTIVATED_SUBSCRIPTION: '#7c3aed',
        REJECTED_PAYMENT: '#dc2626',
      };

      const actionBg: Record<string, string> = {
        CREATED_COMPANY: '#eff6ff',
        DELETED_COMPANY: '#fef2f2',
        ACTIVATED_COMPANY: '#f0fdf4',
        DEACTIVATED_COMPANY: '#fffbeb',
        ACTIVATED_SUBSCRIPTION: '#f5f3ff',
        REJECTED_PAYMENT: '#fef2f2',
      };

      const rows = allLogs.map((log: any, idx: number) => {
        const label = actionLabels[log.action] || log.action;
        const color = actionColors[log.action] || '#475569';
        const bg = actionBg[log.action] || '#f8fafc';
        const details = log.details
          ? Object.entries(log.details).map(([k, v]) => {
              const key = k.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim();
              return `<span style="color:#475569">${key}:</span> <strong>${v}</strong>`;
            }).join('<br>')
          : '<span style="color:#cbd5e1">—</span>';
        const ip = log.ip_address
          ? (log.ip_address === '::1' ? '127.0.0.1' : log.ip_address)
          : '—';
        const date = new Date(log.created_at);
        const dateStr = date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        const timeStr = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
        const rowBg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';

        return `
          <tr style="background:${rowBg}">
            <td style="padding:10px 12px;text-align:center;color:#94a3b8;font-size:11px;border-bottom:1px solid #f1f5f9;">${idx + 1}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;">
              <span style="display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;color:${color};background:${bg};">
                ${label}
              </span>
            </td>
            <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;">
              <div style="font-weight:600;font-size:12px;color:#1e293b;">${log.entity_name || '—'}</div>
              <div style="font-size:10px;color:#94a3b8;text-transform:capitalize;margin-top:1px;">${log.entity_type || ''}</div>
            </td>
            <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:11px;line-height:1.6;">${details}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;">
              <div style="font-size:12px;font-weight:600;color:#1e293b;">${log.performed_by_name || '<span style=color:#94a3b8>System</span>'}</div>
            </td>
            <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-family:monospace;font-size:11px;color:#64748b;">${ip}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;white-space:nowrap;">
              <div style="font-size:11px;font-weight:600;color:#1e293b;">${dateStr}</div>
              <div style="font-size:10px;color:#94a3b8;margin-top:1px;">${timeStr}</div>
            </td>
          </tr>`;
      }).join('');

      const filterInfo = [];
      if (actionFilter) filterInfo.push(`Action: ${actionLabels[actionFilter] || actionFilter}`);
      if (fromDate) filterInfo.push(`From: ${new Date(fromDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`);
      if (toDate) filterInfo.push(`To: ${new Date(toDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`);

      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Audit Logs Report</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #1e293b; }

            .page { max-width: 1000px; margin: 0 auto; padding: 32px; }

            /* Header */
            .header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 28px; padding-bottom: 20px; border-bottom: 2px solid #e2e8f0; }
            .brand { display: flex; align-items: center; gap: 12px; }
            .brand-icon { width: 40px; height: 40px; background: linear-gradient(135deg, #2563eb, #7c3aed); border-radius: 10px; display: flex; align-items: center; justify-content: center; }
            .brand-icon svg { width: 20px; height: 20px; fill: white; }
            .brand-name { font-size: 18px; font-weight: 700; color: #1e293b; }
            .brand-sub { font-size: 11px; color: #94a3b8; margin-top: 1px; }
            .report-meta { text-align: right; }
            .report-title { font-size: 22px; font-weight: 700; color: #1e293b; }
            .report-date { font-size: 11px; color: #64748b; margin-top: 4px; }

            /* Stats */
            .stats { display: flex; gap: 12px; margin-bottom: 20px; }
            .stat-box { flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 16px; }
            .stat-num { font-size: 20px; font-weight: 700; color: #1e293b; }
            .stat-label { font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 2px; }

            /* Filter badge */
            .filters { margin-bottom: 16px; display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
            .filter-label { font-size: 11px; color: #64748b; font-weight: 500; }
            .filter-badge { background: #eff6ff; color: #2563eb; font-size: 11px; font-weight: 600; padding: 2px 10px; border-radius: 20px; }

            /* Table */
            table { width: 100%; border-collapse: collapse; border-radius: 10px; overflow: hidden; border: 1px solid #e2e8f0; }
            thead tr { background: linear-gradient(135deg, #1e293b, #334155); }
            thead th { padding: 11px 12px; text-align: left; font-size: 10px; font-weight: 600; color: #cbd5e1; text-transform: uppercase; letter-spacing: 0.08em; white-space: nowrap; }

            /* Footer */
            .footer { margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
            .footer-left { font-size: 10px; color: #94a3b8; }
            .footer-right { font-size: 10px; color: #94a3b8; }

            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .page { padding: 16px; }
            }
          </style>
        </head>
        <body>
          <div class="page">

            <!-- Header -->
            <div class="header">
              <div class="brand">
                <div class="brand-icon">
                  <svg viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                </div>
                <div>
                  <div class="brand-name">CRM System</div>
                  <div class="brand-sub">Super Admin Control Panel</div>
                </div>
              </div>
              <div class="report-meta">
                <div class="report-title">Audit Logs Report</div>
                <div class="report-date">Generated: ${new Date().toLocaleString('en-IN', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}</div>
              </div>
            </div>

            <!-- Stats -->
            <div class="stats">
              <div class="stat-box">
                <div class="stat-num">${allLogs.length.toLocaleString()}</div>
                <div class="stat-label">Total Records</div>
              </div>
              <div class="stat-box">
                <div class="stat-num">${allLogs.filter((l: any) => l.action?.includes('COMPANY')).length}</div>
                <div class="stat-label">Company Actions</div>
              </div>
              <div class="stat-box">
                <div class="stat-num">${allLogs.filter((l: any) => l.action?.includes('PAYMENT') || l.action?.includes('SUBSCRIPTION')).length}</div>
                <div class="stat-label">Payment Actions</div>
              </div>
              <div class="stat-box">
                <div class="stat-num">${new Set(allLogs.map((l: any) => l.performed_by_name).filter(Boolean)).size}</div>
                <div class="stat-label">Unique Admins</div>
              </div>
            </div>

            <!-- Filters applied -->
            ${filterInfo.length > 0 ? `
            <div class="filters">
              <span class="filter-label">Filters:</span>
              ${filterInfo.map(f => `<span class="filter-badge">${f}</span>`).join('')}
            </div>` : ''}

            <!-- Table -->
            <table>
              <thead>
                <tr>
                  <th style="width:40px">#</th>
                  <th style="width:160px">Action</th>
                  <th style="width:140px">Entity</th>
                  <th>Details</th>
                  <th style="width:110px">Performed By</th>
                  <th style="width:100px">IP Address</th>
                  <th style="width:110px">Date & Time</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>

            <!-- Footer -->
            <div class="footer">
              <div class="footer-left">CRM System — Confidential Report</div>
              <div class="footer-right">Total ${allLogs.length} records exported</div>
            </div>

          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
      setTimeout(() => printWindow.print(), 600);
    } catch (e) {
      console.error('PDF export failed', e);
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <SuperAdminLayout pendingCount={pendingCount || 0}>

      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Audit Logs</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {meta.total !== undefined
              ? `${meta.total.toLocaleString()} total action${meta.total !== 1 ? 's' : ''} recorded`
              : 'Loading...'}
          </p>
        </div>
        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCsvExport}
            disabled={exportingCsv}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {exportingCsv ? 'Exporting...' : 'CSV'}
          </button>
          <button
            onClick={handlePdfExport}
            disabled={exportingPdf}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm disabled:opacity-50"
          >
            <FileText className="w-4 h-4" />
            {exportingPdf ? 'Preparing...' : 'PDF'}
          </button>
        </div>
      </div>

      {/* Summary Cards — server se accurate count */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
            <ClipboardList className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-slate-900">
              {isLoading ? (
                <span className="inline-block w-10 h-5 bg-slate-100 rounded animate-pulse" />
              ) : (
                (meta.total || 0).toLocaleString()
              )}
            </p>
            <p className="text-xs text-slate-400 font-medium">
              {hasFilters ? 'Matching Actions' : 'Total Actions'}
            </p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
            <Building2 className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-slate-900">
              {isLoading ? (
                <span className="inline-block w-10 h-5 bg-slate-100 rounded animate-pulse" />
              ) : (
                logs.filter((l: any) => l.action?.includes('COMPANY')).length
              )}
            </p>
            <p className="text-xs text-slate-400 font-medium">Company Actions (this page)</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-slate-900">
              {isLoading ? (
                <span className="inline-block w-10 h-5 bg-slate-100 rounded animate-pulse" />
              ) : (
                logs.filter((l: any) =>
                  l.action?.includes('PAYMENT') || l.action?.includes('SUBSCRIPTION')
                ).length
              )}
            </p>
            <p className="text-xs text-slate-400 font-medium">Payment Actions (this page)</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 mb-4 shadow-sm">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by company, admin, or action..."
              value={search}
              onChange={(e) => handleFilterChange(setSearch, e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>

          {/* Action Filter */}
          <select
            value={actionFilter}
            onChange={(e) => handleFilterChange(setActionFilter, e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white min-w-[170px]"
          >
            {ACTION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {/* Date From */}
          <div className="relative">
            <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="date"
              value={fromDate}
              onChange={(e) => handleFilterChange(setFromDate, e.target.value)}
              className="pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>

          {/* Date To */}
          <div className="relative">
            <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="date"
              value={toDate}
              onChange={(e) => handleFilterChange(setToDate, e.target.value)}
              className="pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>

          {/* Clear Filters */}
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="px-3 py-2 text-sm text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all font-medium"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Entity</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Details</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Performed By</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">IP</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3.5">
                        <div className="h-3.5 bg-slate-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                      <ClipboardList className="w-7 h-7 text-slate-300" />
                    </div>
                    <p className="text-slate-400 text-sm font-medium">
                      {hasFilters ? 'No logs match your filters' : 'No audit logs yet'}
                    </p>
                    {hasFilters && (
                      <button onClick={clearFilters} className="mt-2 text-xs text-blue-500 hover:underline">
                        Clear filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : filtered.map((log: any) => {
                const config = actionConfig[log.action] || defaultConfig;
                const Icon = config.icon;
                const ip = log.ip_address
                  ? (log.ip_address === '::1' ? '127.0.0.1' : log.ip_address)
                  : '—';

                return (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">

                    {/* Action */}
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
                        <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                        {config.label}
                      </span>
                    </td>

                    {/* Entity */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center font-bold text-slate-600 text-xs flex-shrink-0">
                          {log.entity_name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 text-xs truncate">{log.entity_name || '—'}</p>
                          <p className="text-xs text-slate-400 capitalize truncate">{log.entity_type || '—'}</p>
                        </div>
                      </div>
                    </td>

                    {/* Details */}
                    <td className="px-4 py-3.5">
                      {log.details ? (
                        <div className="space-y-0.5">
                          {Object.entries(log.details).map(([key, val]) => (
                            <p key={key} className="text-xs text-slate-500">
                              <span className="font-medium text-slate-600 capitalize">
                                {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()}:
                              </span>{' '}
                              <span className="text-slate-600">{String(val)}</span>
                            </p>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>

                    {/* Performed By */}
                    <td className="px-4 py-3.5">
                      {log.performed_by_name ? (
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                            {log.performed_by_name.charAt(0).toUpperCase()}
                          </div>
                          <p className="text-xs font-medium text-slate-700 truncate">{log.performed_by_name}</p>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                          <RefreshCw className="w-3 h-3" /> System
                        </span>
                      )}
                    </td>

                    {/* IP */}
                    <td className="px-4 py-3.5">
                      <p className="text-xs font-mono text-slate-400 whitespace-nowrap">{ip}</p>
                    </td>

                    {/* Time */}
                    <td className="px-4 py-3.5">
                      <p className="text-xs text-slate-500 whitespace-nowrap">{formatDateTime(log.created_at)}</p>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination — server se accurate */}
        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50">
            <p className="text-xs text-slate-400">
              Showing{' '}
              <span className="font-semibold text-slate-600">
                {((page - 1) * 15) + 1}–{Math.min(page * 15, meta.total)}
              </span>{' '}
              of{' '}
              <span className="font-semibold text-slate-600">
                {meta.total.toLocaleString()}
              </span>{' '}
              results
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 text-xs font-medium text-slate-600">
                {page} / {meta.totalPages}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === meta.totalPages}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

    </SuperAdminLayout>
  );
};

export default SuperAdminAuditLogs;