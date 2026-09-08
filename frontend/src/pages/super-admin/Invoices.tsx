import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import SuperAdminLayout from '../../components/layout/SuperAdminLayout';
import {
  FileText, Download, Send, Search,
  ChevronLeft, ChevronRight, IndianRupee,
  CheckCircle2, RefreshCw, Eye,
} from 'lucide-react';
import { formatDate } from '../../lib/utils';

const SuperAdminInvoices = () => {
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);

  const { data: pendingCount } = useQuery({
    queryKey: ['super-admin-payments-count'],
    queryFn: async () => {
      const res = await api.get('/super-admin/payments/pending?limit=1');
      return res.data.meta?.total || 0;
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['super-admin-invoices', page],
    queryFn: async () => {
      const res = await api.get(`/super-admin/invoices?page=${page}&limit=15`);
      return res.data;
    },
  });

  const resendMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/super-admin/invoices/${id}/resend`);
      return res.data;
    },
    onSuccess: (data) => {
      setResendingId(null);
      setResendSuccess(`Email resent to ${data.data?.sentTo}!`);
      setTimeout(() => setResendSuccess(null), 3000);
    },
    onError: () => setResendingId(null),
  });

  const handleDownload = async (invoiceId: string, invoiceNumber: string) => {
    setDownloadingId(invoiceId);
    try {
      const stored = localStorage.getItem('crm-auth');
      const token = stored ? JSON.parse(stored)?.state?.accessToken : '';
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/super-admin/invoices/${invoiceId}/download`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) { alert('PDF not available'); return; }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${invoiceNumber}.pdf`;
      document.body.appendChild(a); a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch { alert('Failed to download PDF'); }
    finally { setDownloadingId(null); }
  };

  const invoices = data?.data || [];
  const meta = data?.meta || {};

  const filtered = search
    ? invoices.filter((inv: any) =>
        inv.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
        inv.company_name?.toLowerCase().includes(search.toLowerCase()) ||
        inv.admin_email?.toLowerCase().includes(search.toLowerCase()) ||
        inv.plan_label?.toLowerCase().includes(search.toLowerCase())
      )
    : invoices;

  const totalRevenue = invoices.reduce((sum: number, inv: any) => sum + Number(inv.total_amount || 0), 0);
  const pdfsAvailable = invoices.filter((inv: any) => inv.pdf_path).length;

  return (
    <SuperAdminLayout pendingCount={pendingCount || 0}>

      {/* Header */}
      <div className="mb-5">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Invoices</h1>
        <p className="text-slate-400 text-sm mt-0.5">{meta.total || 0} total invoices</p>
      </div>

      {/* Success */}
      {resendSuccess && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl mb-4 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> {resendSuccess}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
            <FileText className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-slate-900">{meta.total || 0}</p>
            <p className="text-xs text-slate-400 font-medium">Total Invoices</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
            <IndianRupee className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <div className="flex items-center gap-0.5 text-xl font-bold text-slate-900">
              <IndianRupee className="w-3.5 h-3.5" />
              {totalRevenue.toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-slate-400 font-medium">Total Revenue</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
            <Download className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-slate-900">{pdfsAvailable}</p>
            <p className="text-xs text-slate-400 font-medium">PDFs Available</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 mb-4 shadow-sm">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Search by invoice number, company, email, plan..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white" />
        </div>
      </div>

      {/* Table -- no overflow-x, compact */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm table-fixed">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-[22%]">Invoice</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-[20%]">Company</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-[15%]">Plan</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-[18%]">Amount</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-[10%]">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-[10%]">Date</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider w-[15%]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-3.5 bg-slate-100 rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <FileText className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm font-medium">
                    {search ? 'No invoices match your search' : 'No invoices yet'}
                  </p>
                  {!search && <p className="text-slate-300 text-xs mt-1">Invoices are generated when payment is verified</p>}
                </td>
              </tr>
            ) : filtered.map((invoice: any) => (
              <tr key={invoice.id} className="hover:bg-slate-50/70 transition-colors">

                {/* Invoice */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 font-mono text-xs truncate">{invoice.invoice_number}</p>
                      <p className="text-xs text-slate-400 truncate">{invoice.admin_email}</p>
                    </div>
                  </div>
                </td>

                {/* Company */}
                <td className="px-4 py-3">
                  <button onClick={() => navigate(`/super-admin/companies/${invoice.company_id}`)}
                    className="text-left hover:text-blue-600 transition-colors group w-full min-w-0">
                    <p className="font-semibold text-slate-900 group-hover:text-blue-600 text-xs truncate">{invoice.company_name}</p>
                    <p className="text-xs text-slate-400 truncate">{invoice.admin_name}</p>
                  </button>
                </td>

                {/* Plan */}
                <td className="px-4 py-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 truncate max-w-full">
                    {invoice.plan_label || invoice.plan}
                  </span>
                </td>

                {/* Amount + Period */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-0.5 font-bold text-slate-900 text-sm">
                    <IndianRupee className="w-3 h-3 flex-shrink-0" />
                    {Number(invoice.total_amount || 0).toLocaleString('en-IN')}
                  </div>
                  <p className="text-xs text-slate-400 truncate">
                    {formatDate(invoice.subscription_from)} – {formatDate(invoice.subscription_to)}
                  </p>
                </td>

                {/* Status */}
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                    Paid
                  </span>
                </td>

                {/* Date */}
                <td className="px-4 py-3 text-slate-500 text-xs">
                  {formatDate(invoice.created_at)}
                </td>

                {/* Actions */}
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => navigate(`/super-admin/companies/${invoice.company_id}`)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="View">
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    {invoice.pdf_path ? (
                      <button onClick={() => handleDownload(invoice.id, invoice.invoice_number)}
                        disabled={downloadingId === invoice.id}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-60" title="Download PDF">
                        {downloadingId === invoice.id
                          ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          : <Download className="w-3.5 h-3.5" />
                        }
                      </button>
                    ) : (
                      <span className="p-1.5 text-slate-200">
                        <Download className="w-3.5 h-3.5" />
                      </span>
                    )}
                    <button onClick={() => { setResendingId(invoice.id); resendMutation.mutate(invoice.id); }}
                      disabled={resendMutation.isPending && resendingId === invoice.id}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-60" title="Resend Email">
                      {resendMutation.isPending && resendingId === invoice.id
                        ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        : <Send className="w-3.5 h-3.5" />
                      }
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50">
            <p className="text-xs text-slate-400">
              {((page - 1) * 15) + 1}–{Math.min(page * 15, meta.total)} of {meta.total}
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(page - 1)} disabled={page === 1}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 text-xs font-medium text-slate-600">{page} / {meta.totalPages}</span>
              <button onClick={() => setPage(page + 1)} disabled={page === meta.totalPages}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

    </SuperAdminLayout>
  );
};

export default SuperAdminInvoices;