import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import SuperAdminLayout from '../../components/layout/SuperAdminLayout';
import {
  Building2, Mail, Phone, Calendar, Globe,
  CheckCircle2, XCircle, ChevronLeft,
  CreditCard, IndianRupee, AlertTriangle,
  Shield, Users, Activity, RefreshCw,
  Download, FileText, Trash2, Database,
  Clock, UserCheck, UserX, KeyRound,
  BarChart3, HardDrive,
} from 'lucide-react';
import { formatDate, getDaysRemaining } from '../../lib/utils';
import DeleteCompanyModal from '../../components/super-admin/DeleteCompanyModal';

type Tab = 'overview' | 'users' | 'usage';

const SuperAdminCompanyDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [verifyModal, setVerifyModal] = useState(false);
  const [verifyForm, setVerifyForm] = useState({ plan: '1year', amount: '', notes: '', paymentRequestId: '' });
  const [actionError, setActionError] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);

  // Company detail
  const { data: companyData, isLoading } = useQuery({
    queryKey: ['super-admin-company', id],
    queryFn: async () => {
      const res = await api.get(`/super-admin/companies/${id}`);
      return res.data.data;
    },
  });

  // Invoices
  const { data: invoicesData } = useQuery({
    queryKey: ['super-admin-company-invoices', id],
    queryFn: async () => {
      const res = await api.get(`/super-admin/invoices?companyId=${id}&limit=20`);
      return res.data;
    },
  });

  // Pending payments
  const { data: paymentsData } = useQuery({
    queryKey: ['super-admin-company-payments', id],
    queryFn: async () => {
      const res = await api.get(`/super-admin/payments/pending?limit=50`);
      const filtered = res.data.data?.filter((p: any) => p.company_id === id) || [];
      return filtered;
    },
  });

  // Users -- only fetch when tab is active
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['super-admin-company-users', id],
    queryFn: async () => {
      const res = await api.get(`/super-admin/companies/${id}/users`);
      return res.data.data;
    },
    enabled: activeTab === 'users',
  });

  // Usage stats -- only fetch when tab is active
  const { data: usageData, isLoading: usageLoading } = useQuery({
    queryKey: ['super-admin-company-usage', id],
    queryFn: async () => {
      const res = await api.get(`/super-admin/companies/${id}/usage`);
      return res.data.data;
    },
    enabled: activeTab === 'usage',
  });

  const { data: pendingCount } = useQuery({
    queryKey: ['super-admin-payments-count'],
    queryFn: async () => {
      const res = await api.get('/super-admin/payments/pending?limit=1');
      return res.data.meta?.total || 0;
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async (isActive: boolean) => {
      const endpoint = isActive ? 'deactivate' : 'activate';
      const res = await api.patch(`/super-admin/companies/${id}/${endpoint}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-company', id] });
      queryClient.invalidateQueries({ queryKey: ['super-admin-companies'] });
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/super-admin/companies/${id}/verify-payment`, {
        paymentRequestId: verifyForm.paymentRequestId || '',
        plan: verifyForm.plan,
        amount: Number(verifyForm.amount),
        notes: verifyForm.notes,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-company', id] });
      queryClient.invalidateQueries({ queryKey: ['super-admin-company-invoices', id] });
      queryClient.invalidateQueries({ queryKey: ['super-admin-dashboard'] });
      setVerifyModal(false);
      setVerifyForm({ plan: '1year', amount: '', notes: '', paymentRequestId: '' });
      setActionError('');
    },
    onError: (err: any) => {
      setActionError(err.response?.data?.message || 'Failed to verify payment');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (companyName: string) => {
      const res = await api.delete(`/super-admin/companies/${id}`, { data: { companyName } });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-companies'] });
      queryClient.removeQueries({ queryKey: ['super-admin-company', id] });
      queryClient.removeQueries({ queryKey: ['super-admin-company-invoices', id] });
      queryClient.removeQueries({ queryKey: ['super-admin-company-payments', id] });
      setDeleteModalOpen(false);
      setDeleteError('');
      navigate('/super-admin/companies');
    },
    onError: (err: any) => {
      setDeleteError(err.response?.data?.message || 'Failed to delete company. Please try again.');
    },
  });

  const toggleUserMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      const res = await api.patch(`/super-admin/companies/${id}/users/${userId}/toggle`, { isActive });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-company-users', id] });
    },
  });

  const forceResetMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await api.post(`/super-admin/companies/${id}/users/${userId}/force-reset`);
      return res.data;
    },
    onSuccess: () => {
      setResettingUserId(null);
      alert('Password reset email sent to user!');
    },
    onError: (err: any) => {
      setResettingUserId(null);
      alert(err.response?.data?.message || 'Failed to reset password');
    },
  });

  const handleDownloadPdf = async (invoiceId: string, invoiceNumber: string) => {
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

  if (isLoading) {
    return (
      <SuperAdminLayout pendingCount={pendingCount || 0}>
        <div className="animate-pulse space-y-5">
          <div className="h-8 w-48 bg-slate-200 rounded-lg" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 bg-white rounded-xl h-64 border border-slate-200" />
            <div className="bg-white rounded-xl h-64 border border-slate-200" />
          </div>
        </div>
      </SuperAdminLayout>
    );
  }

  if (!companyData) {
    return (
      <SuperAdminLayout pendingCount={pendingCount || 0}>
        <div className="text-center py-20">
          <Building2 className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500">Company not found</p>
          <button onClick={() => navigate('/super-admin/companies')} className="mt-3 text-blue-600 text-sm font-medium">Back to Companies</button>
        </div>
      </SuperAdminLayout>
    );
  }

  const company = companyData;
  const payments = paymentsData || [];
  const invoices = invoicesData?.data || [];
  const expiryDate = company.plan === 'trial' ? company.trial_ends_at : company.subscription_ends_at;
  const daysLeft = expiryDate ? getDaysRemaining(expiryDate) : null;

  const getPlanBadge = (plan: string) => {
    const map: Record<string, { bg: string; text: string; dot: string; label: string }> = {
      trial:     { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500', label: 'Free Trial' },
      active:    { bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500',  label: 'Active' },
      expired:   { bg: 'bg-red-50',    text: 'text-red-700',    dot: 'bg-red-500',    label: 'Expired' },
      suspended: { bg: 'bg-slate-100', text: 'text-slate-600',  dot: 'bg-slate-400',  label: 'Suspended' },
    };
    return map[plan] || map.suspended;
  };

  const badge = getPlanBadge(company.plan);
  const planOptions = [
    { value: '1month', label: '1 Month' },
    { value: '3months', label: '3 Months' },
    { value: '6months', label: '6 Months' },
    { value: '1year', label: '1 Year' },
  ];

  const getRoleBadge = (role: string) => {
    const map: Record<string, string> = {
      admin: 'bg-purple-100 text-purple-700',
      manager: 'bg-blue-100 text-blue-700',
      agent: 'bg-slate-100 text-slate-600',
    };
    return map[role] || 'bg-slate-100 text-slate-600';
  };

  const formatLastLogin = (date: string | null) => {
    if (!date) return 'Never';
    const d = new Date(date);
    const diff = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 7) return `${diff} days ago`;
    return formatDate(date);
  };

  return (
    <SuperAdminLayout pendingCount={pendingCount || 0}>

      {/* Back + Header */}
      <div className="mb-6">
        <button onClick={() => navigate('/super-admin/companies')} className="flex items-center gap-2 text-slate-400 hover:text-slate-600 text-sm font-medium mb-4 transition-colors">
          <ChevronLeft className="w-4 h-4" /> Back to Companies
        </button>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center font-bold text-blue-600 text-2xl shadow-sm">
              {company.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-bold text-slate-900">{company.name}</h1>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${badge.bg} ${badge.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />{badge.label}
                </span>
                {!company.is_active && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-600">
                    <XCircle className="w-3 h-3" /> Inactive
                  </span>
                )}
              </div>
              <p className="text-slate-400 text-sm mt-0.5">{company.slug} · Created {formatDate(company.created_at)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => { setVerifyForm({ plan: '1year', amount: '', notes: '', paymentRequestId: '' }); setActionError(''); setVerifyModal(true); }}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors shadow-sm">
              <CreditCard className="w-4 h-4" /> Activate Subscription
            </button>
            <button onClick={() => toggleActiveMutation.mutate(company.is_active)} disabled={toggleActiveMutation.isPending}
              className={`flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors border ${company.is_active ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}>
              {toggleActiveMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : company.is_active ? <><XCircle className="w-4 h-4" /> Deactivate</> : <><CheckCircle2 className="w-4 h-4" /> Activate</>}
            </button>
            <button onClick={() => setDeleteModalOpen(true)}
              className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors border border-red-200 text-red-600 hover:bg-red-50">
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {daysLeft !== null && daysLeft <= 3 && daysLeft > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-700 font-medium">{company.plan === 'trial' ? 'Trial' : 'Subscription'} expires in <strong>{daysLeft} day{daysLeft !== 1 ? 's' : ''}</strong></p>
        </div>
      )}
      {daysLeft !== null && daysLeft <= 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5 flex items-center gap-3">
          <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 font-medium">{company.plan === 'trial' ? 'Trial' : 'Subscription'} has expired.</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-6 w-fit">
        {[
          { key: 'overview', label: 'Overview', icon: Building2 },
          { key: 'users', label: 'Users', icon: Users },
          { key: 'usage', label: 'Usage & Health', icon: BarChart3 },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as Tab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ===================== OVERVIEW TAB ===================== */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">

            {/* Company Info */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-400" />
                <h3 className="text-sm font-semibold text-slate-900">Company Information</h3>
              </div>
              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
                {[
                  { icon: Building2, label: 'Company Name', value: company.name },
                  { icon: Globe, label: 'Slug / Database', value: company.slug, sub: `crm_client_${company.slug?.replace(/-/g, '_')}` },
                  { icon: Users, label: 'Admin Name', value: company.admin_name },
                  { icon: Mail, label: 'Admin Email', value: company.admin_email },
                  { icon: Phone, label: 'Phone', value: company.phone || '—' },
                  { icon: Calendar, label: 'Created On', value: formatDate(company.created_at) },
                ].map((item) => (
                  <div key={item.label} className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-4 h-4 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">{item.label}</p>
                      <p className="text-sm font-semibold text-slate-900 mt-0.5">{item.value}</p>
                      {item.sub && <p className="text-xs text-slate-400 font-mono">{item.sub}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Invoices */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-400" />
                <h3 className="text-sm font-semibold text-slate-900">Invoices</h3>
                {invoices.length > 0 && <span className="bg-blue-100 text-blue-700 text-xs font-bold px-1.5 py-0.5 rounded-full">{invoices.length}</span>}
              </div>
              <div>
                {invoices.length === 0 ? (
                  <div className="px-5 py-10 text-center">
                    <FileText className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">No invoices yet</p>
                  </div>
                ) : invoices.map((invoice: any) => (
                  <div key={invoice.id} className="flex items-center justify-between px-5 py-4 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{invoice.invoice_number}</p>
                        <p className="text-xs text-slate-400">{invoice.plan_label} · {formatDate(invoice.created_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="flex items-center gap-0.5 font-bold text-slate-900 text-sm justify-end">
                          <IndianRupee className="w-3.5 h-3.5" />
                          {Number(invoice.total_amount || 0).toLocaleString('en-IN')}
                        </div>
                        <span className="text-xs text-green-600 font-medium">Paid</span>
                      </div>
                      {invoice.pdf_path ? (
                        <button onClick={() => handleDownloadPdf(invoice.id, invoice.invoice_number)} disabled={downloadingId === invoice.id}
                          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg transition-colors disabled:opacity-60">
                          {downloadingId === invoice.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                          PDF
                        </button>
                      ) : (
                        <span className="text-xs text-slate-300 px-3 py-1.5">No PDF</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Requests */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-slate-400" />
                <h3 className="text-sm font-semibold text-slate-900">Pending Payment Requests</h3>
                {payments.length > 0 && <span className="bg-amber-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{payments.length}</span>}
              </div>
              <div>
                {payments.length === 0 ? (
                  <div className="px-5 py-10 text-center">
                    <CreditCard className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">No pending payment requests</p>
                  </div>
                ) : payments.map((payment: any) => (
                  <div key={payment.id} className="flex items-center justify-between px-5 py-4 border-b border-slate-50 last:border-0">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">{payment.plan} Plan</p>
                        <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-medium">Pending</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{formatDate(payment.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-0.5 font-bold text-slate-900">
                        <IndianRupee className="w-3.5 h-3.5" />
                        {Number(payment.amount || 0).toLocaleString('en-IN')}
                      </div>
                      <button onClick={() => { setVerifyForm({ plan: payment.plan || '1year', amount: String(payment.amount || ''), notes: '', paymentRequestId: payment.id }); setActionError(''); setVerifyModal(true); }}
                        className="text-xs font-semibold px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded-lg transition-colors flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Verify
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-white rounded-xl border border-red-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-red-100 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <h3 className="text-sm font-semibold text-red-700">Danger Zone</h3>
              </div>
              <div className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Delete this company</p>
                  <p className="text-xs text-slate-400 mt-0.5">Permanently delete company and all its data. This cannot be undone.</p>
                </div>
                <button onClick={() => setDeleteModalOpen(true)}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors flex-shrink-0">
                  <Trash2 className="w-4 h-4" /> Delete Company
                </button>
              </div>
            </div>
          </div>

          {/* Right sidebar */}
          <div className="space-y-5">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                <Shield className="w-4 h-4 text-slate-400" />
                <h3 className="text-sm font-semibold text-slate-900">Subscription</h3>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1.5">Current Plan</p>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold ${badge.bg} ${badge.text}`}>
                    <span className={`w-2 h-2 rounded-full ${badge.dot}`} />{badge.label}
                  </span>
                </div>
                {company.plan === 'trial' && company.trial_ends_at && (
                  <div>
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1.5">Trial Ends</p>
                    <div className="bg-purple-50 border border-purple-100 rounded-lg p-3">
                      <p className="text-sm font-semibold text-purple-900">{formatDate(company.trial_ends_at)}</p>
                      {daysLeft !== null && <p className={`text-xs font-medium mt-0.5 ${daysLeft <= 0 ? 'text-red-500' : daysLeft <= 2 ? 'text-amber-500' : 'text-purple-600'}`}>{daysLeft <= 0 ? 'Trial Expired' : `${daysLeft} days remaining`}</p>}
                    </div>
                  </div>
                )}
                {company.plan === 'active' && company.subscription_ends_at && (
                  <>
                    <div>
                      <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1.5">Plan</p>
                      <p className="text-sm font-semibold text-slate-900">{company.subscription_plan || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1.5">Valid Until</p>
                      <div className="bg-green-50 border border-green-100 rounded-lg p-3">
                        <p className="text-sm font-semibold text-green-900">{formatDate(company.subscription_ends_at)}</p>
                        {daysLeft !== null && <p className={`text-xs font-medium mt-0.5 ${daysLeft <= 7 ? 'text-amber-500' : 'text-green-600'}`}>{daysLeft <= 0 ? 'Expired' : `${daysLeft} days remaining`}</p>}
                      </div>
                    </div>
                    {company.subscription_amount && (
                      <div>
                        <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1.5">Amount Paid</p>
                        <div className="flex items-center gap-0.5 text-slate-900 font-bold text-lg">
                          <IndianRupee className="w-4 h-4" />{Number(company.subscription_amount).toLocaleString('en-IN')}
                        </div>
                      </div>
                    )}
                    {company.subscription_start_at && (
                      <div>
                        <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">Started On</p>
                        <p className="text-sm text-slate-600">{formatDate(company.subscription_start_at)}</p>
                      </div>
                    )}
                  </>
                )}
                <button onClick={() => { setVerifyForm({ plan: '1year', amount: '', notes: '', paymentRequestId: '' }); setActionError(''); setVerifyModal(true); }}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors">
                  <CreditCard className="w-4 h-4" />{company.plan === 'active' ? 'Extend Subscription' : 'Activate Subscription'}
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                <Activity className="w-4 h-4 text-slate-400" />
                <h3 className="text-sm font-semibold text-slate-900">Account Stats</h3>
              </div>
              <div className="p-5 space-y-3">
                {[
                  { label: 'Account Status', value: company.is_active ? 'Active' : 'Inactive', color: company.is_active ? 'text-green-600' : 'text-red-500' },
                  { label: 'Total Invoices', value: String(invoices.length), color: 'text-slate-900' },
                  { label: 'Payment Requests', value: String(company.total_payment_requests || 0), color: 'text-slate-900' },
                  { label: 'Pending Payments', value: String(company.pending_payments || 0), color: Number(company.pending_payments) > 0 ? 'text-amber-600' : 'text-slate-900' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                    <p className="text-xs text-slate-400 font-medium">{item.label}</p>
                    <p className={`text-sm font-semibold ${item.color}`}>{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== USERS TAB ===================== */}
      {activeTab === 'users' && (
        <div className="space-y-5">
          {usersLoading ? (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-slate-400">Loading users...</p>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Total Users', value: usersData?.total || 0, color: 'text-slate-900', bg: 'bg-slate-50' },
                  { label: 'Admins', value: usersData?.admin?.length || 0, color: 'text-purple-700', bg: 'bg-purple-50' },
                  { label: 'Managers', value: usersData?.manager?.length || 0, color: 'text-blue-700', bg: 'bg-blue-50' },
                  { label: 'Agents', value: usersData?.agent?.length || 0, color: 'text-slate-600', bg: 'bg-slate-50' },
                ].map((card) => (
                  <div key={card.label} className={`${card.bg} rounded-xl border border-slate-200 p-4 text-center`}>
                    <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
                    <p className="text-xs text-slate-400 mt-1 font-medium">{card.label}</p>
                  </div>
                ))}
              </div>

              {/* Users Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-400" />
                  <h3 className="text-sm font-semibold text-slate-900">All Users</h3>
                  <span className="bg-slate-100 text-slate-600 text-xs font-bold px-1.5 py-0.5 rounded-full">{usersData?.total || 0}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Last Login</th>
                        <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {[...(usersData?.admin || []), ...(usersData?.manager || []), ...(usersData?.agent || [])].map((user: any) => (
                        <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 font-semibold text-xs flex-shrink-0">
                                {user.name?.charAt(0)?.toUpperCase()}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-900 text-sm">{user.name}</p>
                                <p className="text-xs text-slate-400">{user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${getRoleBadge(user.role)}`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-flex items-center gap-1 text-xs font-medium ${user.is_active ? 'text-green-600' : 'text-red-500'}`}>
                              {user.is_active ? <><UserCheck className="w-3.5 h-3.5" /> Active</> : <><UserX className="w-3.5 h-3.5" /> Inactive</>}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-1 text-xs text-slate-500">
                              <Clock className="w-3.5 h-3.5" />
                              {formatLastLogin(user.last_login_at)}
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => toggleUserMutation.mutate({ userId: user.id, isActive: !user.is_active })}
                                disabled={toggleUserMutation.isPending}
                                className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                                  user.is_active
                                    ? 'border-red-200 text-red-600 hover:bg-red-50'
                                    : 'border-green-200 text-green-600 hover:bg-green-50'
                                }`}
                              >
                                {user.is_active ? 'Disable' : 'Enable'}
                              </button>
                              <button
                                onClick={() => { setResettingUserId(user.id); forceResetMutation.mutate(user.id); }}
                                disabled={forceResetMutation.isPending && resettingUserId === user.id}
                                className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg border border-amber-200 text-amber-700 hover:bg-amber-50 transition-colors disabled:opacity-60"
                              >
                                {forceResetMutation.isPending && resettingUserId === user.id
                                  ? <RefreshCw className="w-3 h-3 animate-spin" />
                                  : <KeyRound className="w-3 h-3" />
                                }
                                Reset
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {(!usersData || usersData.total === 0) && (
                    <div className="px-5 py-10 text-center">
                      <Users className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                      <p className="text-sm text-slate-400">No users found</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ===================== USAGE TAB ===================== */}
      {activeTab === 'usage' && (
        <div className="space-y-5">
          {usageLoading ? (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-slate-400">Loading usage stats...</p>
            </div>
          ) : (
            <>
              {/* Usage Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                  { label: 'Users', value: usageData?.users || 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
                  { label: 'Leads', value: usageData?.leads || 0, icon: Activity, color: 'text-green-600', bg: 'bg-green-50' },
                  { label: 'Clients', value: usageData?.clients || 0, icon: UserCheck, color: 'text-purple-600', bg: 'bg-purple-50' },
                  { label: 'Quotations', value: usageData?.quotations || 0, icon: FileText, color: 'text-amber-600', bg: 'bg-amber-50' },
                  { label: 'Deals', value: usageData?.deals || 0, icon: CreditCard, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                  { label: 'Invoices', value: usageData?.invoices || 0, icon: IndianRupee, color: 'text-rose-600', bg: 'bg-rose-50' },
                ].map((stat) => (
                  <div key={stat.label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 text-center">
                    <div className={`w-10 h-10 ${stat.bg} rounded-lg flex items-center justify-center mx-auto mb-3`}>
                      <stat.icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{stat.value.toLocaleString()}</p>
                    <p className="text-xs text-slate-400 mt-1 font-medium">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Database Info */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                  <Database className="w-4 h-4 text-slate-400" />
                  <h3 className="text-sm font-semibold text-slate-900">Database Information</h3>
                </div>
                <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 bg-slate-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Database className="w-4 h-4 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Database Name</p>
                      <p className="text-sm font-semibold text-slate-900 mt-0.5 font-mono">{usageData?.dbName || '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <HardDrive className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Database Size</p>
                      <p className="text-sm font-semibold text-slate-900 mt-0.5">{usageData?.dbSize || '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Clock className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Last Activity</p>
                      <p className="text-sm font-semibold text-slate-900 mt-0.5">
                        {usageData?.lastActivity ? formatLastLogin(usageData.lastActivity) : 'No activity'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Health Indicator */}
              {usageData && (
                <div className={`rounded-xl border p-5 flex items-center gap-4 ${
                  !usageData.lastActivity ? 'bg-red-50 border-red-200' :
                  (() => {
                    const days = Math.floor((Date.now() - new Date(usageData.lastActivity).getTime()) / (1000 * 60 * 60 * 24));
                    return days <= 7 ? 'bg-green-50 border-green-200' : days <= 30 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200';
                  })()
                }`}>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
                    !usageData.lastActivity ? 'bg-red-100' :
                    (() => {
                      const days = Math.floor((Date.now() - new Date(usageData.lastActivity).getTime()) / (1000 * 60 * 60 * 24));
                      return days <= 7 ? 'bg-green-100' : days <= 30 ? 'bg-amber-100' : 'bg-red-100';
                    })()
                  }`}>
                    {!usageData.lastActivity ? '🔴' :
                      (() => {
                        const days = Math.floor((Date.now() - new Date(usageData.lastActivity).getTime()) / (1000 * 60 * 60 * 24));
                        return days <= 7 ? '🟢' : days <= 30 ? '🟡' : '🔴';
                      })()
                    }
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">
                      {!usageData.lastActivity ? 'Inactive — No logins recorded' :
                        (() => {
                          const days = Math.floor((Date.now() - new Date(usageData.lastActivity).getTime()) / (1000 * 60 * 60 * 24));
                          return days <= 7 ? 'Healthy — Active usage detected' : days <= 30 ? 'Low Activity — Last seen within 30 days' : 'Inactive — No activity for over 30 days';
                        })()
                      }
                    </p>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {usageData.lastActivity
                        ? `Last login: ${formatLastLogin(usageData.lastActivity)}`
                        : 'No users have logged in yet'
                      }
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Verify Modal */}
      {verifyModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Activate Subscription</h3>
                <p className="text-xs text-slate-400 mt-0.5">{company.name}</p>
              </div>
              <button onClick={() => setVerifyModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {actionError && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg">{actionError}</div>}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Subscription Plan *</label>
                <select value={verifyForm.plan} onChange={(e) => setVerifyForm({ ...verifyForm, plan: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {planOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Amount Received (Rs.) *</label>
                <div className="relative">
                  <IndianRupee className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="number" placeholder="Enter amount" value={verifyForm.amount}
                    onChange={(e) => setVerifyForm({ ...verifyForm, amount: e.target.value })}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Notes (Optional)</label>
                <textarea placeholder="Payment reference, notes..." value={verifyForm.notes}
                  onChange={(e) => setVerifyForm({ ...verifyForm, notes: e.target.value })}
                  rows={2} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              <div className="bg-green-50 border border-green-100 rounded-lg p-3 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-green-700">Subscription will be activated and invoice PDF emailed to {company.admin_email}.</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100">
              <button onClick={() => setVerifyModal(false)} className="px-4 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-700">Cancel</button>
              <button onClick={() => verifyMutation.mutate()} disabled={verifyMutation.isPending || !verifyForm.amount}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors">
                {verifyMutation.isPending ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Activating...</> : <><CheckCircle2 className="w-4 h-4" /> Activate & Invoice</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      <DeleteCompanyModal
        isOpen={deleteModalOpen}
        companyName={company.name}
        isDeleting={deleteMutation.isPending}
        error={deleteError}
        onClose={() => { if (deleteMutation.isPending) return; setDeleteModalOpen(false); setDeleteError(''); }}
        onConfirm={() => deleteMutation.mutate(company.name)}
      />

    </SuperAdminLayout>
  );
};

export default SuperAdminCompanyDetail;