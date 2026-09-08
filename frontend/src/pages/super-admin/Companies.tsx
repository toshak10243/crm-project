import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import SuperAdminLayout from '../../components/layout/SuperAdminLayout';
import {
  Building2, Plus, Search, ChevronRight,
  CheckCircle2, XCircle, ChevronLeft, Trash2,
  Send, Mail, MessageSquare, Eye, Copy, ExternalLink,
} from 'lucide-react';
import { formatDate, getDaysRemaining } from '../../lib/utils';
import DeleteCompanyModal from '../../components/super-admin/DeleteCompanyModal';

const SuperAdminCompanies = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '', slug: '', adminName: '', adminEmail: '', phone: '', address: '',
  });
  const [createError, setCreateError] = useState('');

  // Delete modal state
  const [selectedCompanyForDelete, setSelectedCompanyForDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleteError, setDeleteError] = useState('');

  // Send message modal state
  const [sendModal, setSendModal] = useState<{ company: any } | null>(null);
  const [sendType, setSendType] = useState<'email' | 'whatsapp'>('email');
  const [selectedTemplateKey, setSelectedTemplateKey] = useState('');
  const [previewBody, setPreviewBody] = useState('');
  const [previewSubject, setPreviewSubject] = useState('');
  const [sendSuccess, setSendSuccess] = useState('');
  const [sendError, setSendError] = useState('');
  const [copiedPreview, setCopiedPreview] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['super-admin-companies', search, planFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page), limit: '15',
        ...(search && { search }),
        ...(planFilter && { plan: planFilter }),
      });
      const res = await api.get(`/super-admin/companies?${params}`);
      return res.data;
    },
  });

  const { data: pendingCount } = useQuery({
    queryKey: ['super-admin-payments-count'],
    queryFn: async () => {
      const res = await api.get('/super-admin/payments/pending?limit=1');
      return res.data.meta?.total || 0;
    },
  });

  // Email templates
  const { data: emailTemplates } = useQuery({
    queryKey: ['email-templates'],
    queryFn: async () => {
      const res = await api.get('/super-admin/email-templates');
      return res.data.data;
    },
    enabled: !!sendModal && sendType === 'email',
  });

  // WhatsApp templates
  const { data: waTemplates } = useQuery({
    queryKey: ['whatsapp-templates'],
    queryFn: async () => {
      const res = await api.get('/super-admin/whatsapp-templates');
      return res.data.data;
    },
    enabled: !!sendModal && sendType === 'whatsapp',
  });

  // Company template data (real values)
  const { data: templateData } = useQuery({
    queryKey: ['company-template-data', sendModal?.company?.id],
    queryFn: async () => {
      const res = await api.get(`/super-admin/companies/${sendModal!.company.id}/template-data`);
      return res.data.data;
    },
    enabled: !!sendModal,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof createForm) => {
      const res = await api.post('/super-admin/companies', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-companies'] });
      setShowCreateModal(false);
      setCreateForm({ name: '', slug: '', adminName: '', adminEmail: '', phone: '', address: '' });
      setCreateError('');
    },
    onError: (err: any) => {
      setCreateError(err.response?.data?.message || 'Failed to create company');
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const endpoint = isActive ? 'deactivate' : 'activate';
      const res = await api.patch(`/super-admin/companies/${id}/${endpoint}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-companies'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, companyName }: { id: string; companyName: string }) => {
      const res = await api.delete(`/super-admin/companies/${id}`, { data: { companyName } });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-companies'] });
      if (selectedCompanyForDelete) {
        queryClient.invalidateQueries({ queryKey: ['super-admin-company', selectedCompanyForDelete.id] });
      }
      const companies = data?.data || [];
      if (companies.length === 1 && page > 1) setPage((prev) => prev - 1);
      setSelectedCompanyForDelete(null);
      setDeleteError('');
    },
    onError: (err: any) => {
      setDeleteError(err.response?.data?.message || 'Failed to delete company. Please try again.');
    },
  });

  const sendEmailMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/super-admin/companies/${sendModal!.company.id}/send-template-email`, {
        templateKey: selectedTemplateKey,
      });
      return res.data;
    },
    onSuccess: (data) => {
      setSendSuccess(`Email sent to ${data.data?.sentTo || templateData?.admin_email}!`);
      setTimeout(() => {
        setSendModal(null);
        setSendSuccess('');
        setSendError('');
        setSelectedTemplateKey('');
        setPreviewBody('');
        setPreviewSubject('');
      }, 2500);
    },
    onError: (err: any) => {
      setSendError(err.response?.data?.message || 'Failed to send email');
    },
  });

  // Fill template with real data
  const fillTemplate = (text: string, data: Record<string, string>) => {
    let filled = text;
    for (const [key, value] of Object.entries(data)) {
      filled = filled.replace(new RegExp(`{{${key}}}`, 'g'), value || `{{${key}}}`);
    }
    return filled;
  };

  const handleTemplateSelect = (key: string) => {
    setSelectedTemplateKey(key);
    setSendError('');
    if (!templateData) return;

    if (sendType === 'email') {
      const template = (emailTemplates || []).find((t: any) => t.key === key);
      if (template) {
        setPreviewSubject(fillTemplate(template.subject, templateData));
        setPreviewBody(fillTemplate(template.body || '', templateData));
      }
    } else {
      const template = (waTemplates || []).find((t: any) => t.key === key);
      if (template) {
        setPreviewBody(fillTemplate(template.body, templateData));
        setPreviewSubject('');
      }
    }
  };

  const handleCopyPreview = () => {
    navigator.clipboard.writeText(previewBody);
    setCopiedPreview(true);
    setTimeout(() => setCopiedPreview(false), 2000);
  };

  const handleWhatsAppSend = () => {
    const phone = templateData?.admin_phone?.replace(/\D/g, '') || '';
    const text = encodeURIComponent(previewBody);
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
  };

  const handleMailtoSend = () => {
    const email = templateData?.admin_email || '';
    const subject = encodeURIComponent(previewSubject);
    window.open(`mailto:${email}?subject=${subject}&body=${encodeURIComponent(previewBody)}`, '_blank');
  };

  const companies = data?.data || [];
  const meta = data?.meta || {};

  const getPlanBadge = (plan: string) => {
    const map: Record<string, { bg: string; text: string; dot: string; label: string }> = {
      trial:     { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500', label: 'Trial' },
      active:    { bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500',  label: 'Active' },
      expired:   { bg: 'bg-red-50',    text: 'text-red-700',    dot: 'bg-red-500',    label: 'Expired' },
      suspended: { bg: 'bg-slate-50',  text: 'text-slate-500',  dot: 'bg-slate-400',  label: 'Suspended' },
    };
    return map[plan] || map.suspended;
  };

  const handleNameChange = (name: string) => {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    setCreateForm({ ...createForm, name, slug });
  };

  const handleDeleteClick = (e: React.MouseEvent, company: { id: string; name: string }) => {
    e.stopPropagation();
    setDeleteError('');
    setSelectedCompanyForDelete(company);
  };

  const handleDeleteClose = () => {
    if (deleteMutation.isPending) return;
    setSelectedCompanyForDelete(null);
    setDeleteError('');
  };

  const handleDeleteConfirm = () => {
    if (!selectedCompanyForDelete || deleteMutation.isPending) return;
    deleteMutation.mutate({ id: selectedCompanyForDelete.id, companyName: selectedCompanyForDelete.name });
  };

  return (
    <SuperAdminLayout pendingCount={pendingCount || 0}>

      {/* Page Header */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Companies</h1>
          <p className="text-slate-400 text-sm mt-0.5">{meta.total || 0} total {meta.total === 1 ? 'company' : 'companies'}</p>
        </div>
        <button onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> New Company
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-5 flex flex-wrap gap-3 shadow-sm">
        <div className="flex-1 min-w-52 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Search by name, email, slug..."
            value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all" />
        </div>
        <select value={planFilter} onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
          <option value="">All Plans</option>
          <option value="trial">Trial</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Company</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Admin</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Plan</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Expiry</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Created</th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-5 py-4"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>
                  ))}</tr>
                ))
              ) : companies.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center">
                    <Building2 className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-400 text-sm font-medium">No companies found</p>
                    <p className="text-slate-300 text-xs mt-1">{search || planFilter ? 'Try adjusting your filters' : 'Create your first company to get started'}</p>
                    {!search && !planFilter && (
                      <button onClick={() => setShowCreateModal(true)} className="mt-3 text-blue-600 hover:text-blue-700 text-sm font-medium">+ Create Company</button>
                    )}
                  </td>
                </tr>
              ) : companies.map((company: any) => {
                const badge = getPlanBadge(company.plan);
                const expiryDate = company.plan === 'trial' ? company.trial_ends_at : company.subscription_ends_at;
                const daysLeft = expiryDate ? getDaysRemaining(expiryDate) : null;

                return (
                  <tr key={company.id} className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                    onClick={() => navigate(`/super-admin/companies/${company.id}`)}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center font-bold text-blue-600 text-sm flex-shrink-0">
                          {company.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">{company.name}</p>
                          <p className="text-xs text-slate-400">{company.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-slate-700 font-medium">{company.admin_name}</p>
                      <p className="text-xs text-slate-400">{company.admin_email}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${badge.bg} ${badge.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />{badge.label}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {expiryDate ? (
                        <div>
                          <p className="text-slate-700 text-sm">{formatDate(expiryDate)}</p>
                          {daysLeft !== null && (
                            <p className={`text-xs font-medium mt-0.5 ${daysLeft <= 0 ? 'text-red-500' : daysLeft <= 2 ? 'text-red-500' : daysLeft <= 7 ? 'text-amber-500' : 'text-slate-400'}`}>
                              {daysLeft <= 0 ? 'Expired' : `${daysLeft} days left`}
                            </p>
                          )}
                        </div>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium ${company.is_active ? 'text-green-600' : 'text-red-500'}`}>
                        {company.is_active ? <><CheckCircle2 className="w-3.5 h-3.5" /> Active</> : <><XCircle className="w-3.5 h-3.5" /> Inactive</>}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-400 text-xs">{formatDate(company.created_at)}</td>
                    <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Send Message Button */}
                        <button
                          onClick={() => {
                            setSendModal({ company });
                            setSendType('email');
                            setSelectedTemplateKey('');
                            setPreviewBody('');
                            setPreviewSubject('');
                            setSendSuccess('');
                            setSendError('');
                          }}
                          className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg transition-colors"
                          title="Send Email or WhatsApp"
                        >
                          <Send className="w-3.5 h-3.5" /> Send
                        </button>

                        <button
                          onClick={() => toggleActiveMutation.mutate({ id: company.id, isActive: company.is_active })}
                          disabled={toggleActiveMutation.isPending}
                          className={`text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors ${
                            company.is_active ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-green-200 text-green-600 hover:bg-green-50'
                          }`}
                        >
                          {company.is_active ? 'Deactivate' : 'Activate'}
                        </button>

                        <button onClick={(e) => handleDeleteClick(e, { id: company.id, name: company.name })}
                          className="p-1.5 text-slate-300 hover:text-red-500 transition-colors" title="Delete Company">
                          <Trash2 className="w-4 h-4" />
                        </button>

                        <button onClick={() => navigate(`/super-admin/companies/${company.id}`)}
                          className="p-1.5 text-slate-300 hover:text-slate-600 transition-colors">
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100 bg-slate-50/50">
            <p className="text-xs text-slate-400">
              Showing {((page - 1) * 15) + 1}–{Math.min(page * 15, meta.total)} of {meta.total} companies
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(page - 1)} disabled={page === 1}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 text-xs font-medium text-slate-600">{page} / {meta.totalPages}</span>
              <button onClick={() => setPage(page + 1)} disabled={page === meta.totalPages}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ============ SEND MESSAGE MODAL ============ */}
      {sendModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 flex-shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-900">Send Message</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  To: <span className="font-semibold text-slate-600">{sendModal.company.name}</span>
                  {templateData && <span className="ml-2 text-slate-400">({templateData.admin_email}{templateData.admin_phone ? ` · ${templateData.admin_phone}` : ''})</span>}
                </p>
              </div>
              <button onClick={() => setSendModal(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

              {/* Success */}
              {sendSuccess && (
                <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> {sendSuccess}
                </div>
              )}

              {/* Error */}
              {sendError && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg flex items-center gap-2">
                  <XCircle className="w-4 h-4 flex-shrink-0" /> {sendError}
                </div>
              )}

              {/* Type toggle */}
              <div>
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Channel</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setSendType('email'); setSelectedTemplateKey(''); setPreviewBody(''); setPreviewSubject(''); setSendError(''); }}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold border transition-colors ${
                      sendType === 'email' ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Mail className="w-4 h-4" /> Email
                  </button>
                  <button
                    onClick={() => { setSendType('whatsapp'); setSelectedTemplateKey(''); setPreviewBody(''); setPreviewSubject(''); setSendError(''); }}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold border transition-colors ${
                      sendType === 'whatsapp' ? 'bg-green-600 text-white border-green-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4" /> WhatsApp
                  </button>
                </div>
              </div>

              {/* Template selector */}
              <div>
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Select Template</p>
                <select
                  value={selectedTemplateKey}
                  onChange={(e) => handleTemplateSelect(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Select a template --</option>
                  {(sendType === 'email' ? emailTemplates : waTemplates || [])?.map((t: any) => (
                    <option key={t.key} value={t.key}>{t.name}</option>
                  ))}
                </select>
              </div>

              {/* Preview */}
              {selectedTemplateKey && previewBody && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5" /> Preview (Real Data)
                    </p>
                    <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-medium">Variables filled</span>
                  </div>

                  {sendType === 'email' && previewSubject && (
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Subject:</p>
                      <p className="text-sm font-semibold text-slate-800 bg-slate-50 px-3 py-2 rounded-lg">{previewSubject}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-xs text-slate-400 mb-1">Message:</p>
                    {sendType === 'whatsapp' ? (
                      <div className="bg-[#dcf8c6] border border-green-200 rounded-xl p-4 font-mono text-sm text-slate-800 whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto">
                        {previewBody}
                      </div>
                    ) : (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto font-mono">
                        {previewBody}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 flex-shrink-0">
              <button onClick={() => setSendModal(null)} className="px-4 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-700">
                Cancel
              </button>

              {selectedTemplateKey && previewBody && (
                <div className="flex items-center gap-2">
                  {sendType === 'whatsapp' ? (
                    <>
                      <button onClick={handleCopyPreview}
                        className={`flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-lg border transition-colors ${
                          copiedPreview ? 'bg-green-600 text-white border-green-600' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}>
                        {copiedPreview ? <><CheckCircle2 className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy</>}
                      </button>
                      <button onClick={handleWhatsAppSend}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors">
                        <ExternalLink className="w-4 h-4" /> Open WhatsApp
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={handleMailtoSend}
                        className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors">
                        <ExternalLink className="w-4 h-4" /> Open Mail App
                      </button>
                      <button
                        onClick={() => sendEmailMutation.mutate()}
                        disabled={sendEmailMutation.isPending}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
                      >
                        {sendEmailMutation.isPending
                          ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending...</>
                          : <><Send className="w-4 h-4" /> Send Email</>
                        }
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Company Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Create New Company</h3>
                <p className="text-xs text-slate-400 mt-0.5">7-day free trial starts automatically</p>
              </div>
              <button onClick={() => { setShowCreateModal(false); setCreateError(''); }}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {createError && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg flex items-center gap-2">
                  <XCircle className="w-4 h-4 flex-shrink-0" />{createError}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Company Name *</label>
                  <input type="text" placeholder="Sharma Traders" value={createForm.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Slug *</label>
                  <input type="text" placeholder="sharma-traders" value={createForm.slug}
                    onChange={(e) => setCreateForm({ ...createForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white" />
                  <p className="text-xs text-slate-400 mt-1">DB: crm_client_{createForm.slug || '...'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Admin Name *</label>
                  <input type="text" placeholder="Ramesh Sharma" value={createForm.adminName}
                    onChange={(e) => setCreateForm({ ...createForm, adminName: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Admin Email *</label>
                  <input type="email" placeholder="ramesh@company.com" value={createForm.adminEmail}
                    onChange={(e) => setCreateForm({ ...createForm, adminEmail: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Phone</label>
                <input type="text" placeholder="9876543210" value={createForm.phone}
                  onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white" />
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700">A welcome email with login credentials will be sent to the admin automatically after creation.</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100">
              <button onClick={() => { setShowCreateModal(false); setCreateError(''); }}
                className="px-4 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors">Cancel</button>
              <button onClick={() => createMutation.mutate(createForm)}
                disabled={createMutation.isPending || !createForm.name || !createForm.slug || !createForm.adminName || !createForm.adminEmail}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors shadow-sm">
                {createMutation.isPending
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating...</>
                  : <><Plus className="w-4 h-4" /> Create Company</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Company Modal */}
      <DeleteCompanyModal
        isOpen={!!selectedCompanyForDelete}
        companyName={selectedCompanyForDelete?.name ?? ''}
        isDeleting={deleteMutation.isPending}
        error={deleteError}
        onClose={handleDeleteClose}
        onConfirm={handleDeleteConfirm}
      />

    </SuperAdminLayout>
  );
};

export default SuperAdminCompanies;